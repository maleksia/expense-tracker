import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from flask_socketio import SocketIO
from db import db
from models import User, Expense, Payer, Category, DeletedExpense, ExpenseList, ListParticipant
from sqlalchemy.exc import SQLAlchemyError

app = Flask(__name__, static_folder='../frontend/build', static_url_path='/')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///expenses.db'
db.init_app(app)
CORS(app, resources={
    r"/*": {
        "origins": '*',
        "supports_credentials": True,
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})
socketio = SocketIO(app, cors_allowed_origins="*")

@app.route('/payers', methods=['OPTIONS', 'GET', 'POST'])
def payers():
    if request.method == 'OPTIONS':
        response = jsonify({'message': 'OK'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        return response

    try:
        if request.method == 'POST':
            data = request.get_json()

            if not data:
                return jsonify({'error': 'No data provided'}), 400
            
            if not isinstance(data, dict):
                return jsonify({'error': 'Invalid data format'}), 400
            
            missing_fields = []
            if 'name' not in data:
                missing_fields.append('name')
            if 'username' not in data:
                missing_fields.append('username')
                
            if missing_fields:
                return jsonify({
                    'error': 'Missing required fields',
                    'missing_fields': missing_fields
                }), 400

            new_payer = Payer(
                name=data['name'],
                username=data.get('username')  # Get username from data or current user
            )
            db.session.add(new_payer)
            db.session.commit()
            
            return jsonify({
                'id': new_payer.id,
                'name': new_payer.name
            }), 201

        # GET request
        username = request.args.get('username')
        if not username:
            return jsonify({'error': 'Username parameter is required'}), 400
            
        payers = Payer.query.filter_by(username=username).all()
        return jsonify([{
            'id': p.id,
            'name': p.name
        } for p in payers])

    except SQLAlchemyError as e:
        db.session.rollback()
        print(f"Database error in payers endpoint: {str(e)}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        db.session.rollback()
        print(f"Error in payers endpoint: {str(e)}")
        return jsonify({'error': str(e)}), 500
    
@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        response = app.response_class(status=200)
        response.headers.add("Access-Control-Allow-Origin", "http://localhost:3000")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type")
        response.headers.add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        response.headers.add("Access-Control-Allow-Credentials", "true")
        return response
    
def calculate_debts_internal(username=None, list_id=None):
    if not username:
        return {}
        
    query = Expense.query.filter_by(username=username)
    if list_id:
        query = query.filter_by(list_id=list_id)
    
    expenses = query.all()
    if not expenses:
        return {}
    
    debts = {}
    for expense in expenses:
        payer = expense.payer
        amount = expense.amount
        participants = expense.participants.split(',') if expense.participants else [payer]
        
        share = amount / len(participants)
        
        for participant in participants:
            if participant != payer:
                if participant not in debts:
                    debts[participant] = {}
                if payer not in debts[participant]:
                    debts[participant][payer] = 0
                debts[participant][payer] += share

    return debts

@app.route('/calculate-debts', methods=['GET'])
def calculate_debts():
    username = request.args.get('username')
    list_id = request.args.get('list_id')
    
    if not username:
        return jsonify({"error": "Username required"}), 400
        
    # Use the existing calculate_debts_internal function
    debts = calculate_debts_internal(username, list_id)
    
    # Emit update through socket
    socketio.emit(f'expensesUpdated_{username}_{list_id}', debts)
    
    return jsonify(debts)

@socketio.on('connect')
def handle_connect():
    username = request.args.get('username')
    if username:
        debts = calculate_debts_internal(username)
        socketio.emit(f'expensesUpdated_{username}', debts)

@app.route('/add-expense', methods=['POST'])
def add_expense():
    try:
        data = request.get_json()
        participants_str = ','.join(data.get('participants', []))
        
        new_expense = Expense(
            payer=data['payer'],
            amount=float(data['amount']),
            description=data['description'],
            category=data['category'],
            date=datetime.strptime(data['date'], '%Y-%m-%d') if 'date' in data else None,
            username=data['username'],
            participants=participants_str,
            list_id=data['list_id']
        )
        
        db.session.add(new_expense)
        db.session.commit()
        
        expense_dict = new_expense.as_dict()
        expense_dict['participants'] = data.get('participants', [])
        
        # Update debts calculation with list_id
        debts = calculate_debts_internal(data['username'], data['list_id'])
        socketio.emit(f'expensesUpdated_{data["username"]}_{data["list_id"]}', debts)
        
        return jsonify(expense_dict), 201
    
    except SQLAlchemyError as e:
        db.session.rollback()
        print(f"Database error in add_expense endpoint: {str(e)}")
        return jsonify({"error": "Database error occurred"}), 500
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@app.route('/expenses', methods=['GET'])
def get_expenses():
    username = request.args.get('username')
    list_id = request.args.get('list_id')
    
    if not username:
        return jsonify({"error": "Username required"}), 400
    
    query = Expense.query.filter_by(username=username)
    if list_id:
        query = query.filter_by(list_id=list_id)
    
    expenses = query.all()
    return jsonify([expense.as_dict() for expense in expenses])

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/version', methods=['GET'])
def get_app_version():
    return jsonify({"version": "1.0.0"})

@app.route('/debts', methods=['GET'])
def get_balances():
    expenses = Expense.query.all()
    balances = {}
    
    for expense in expenses:
        if expense.payer not in balances:
            balances[expense.payer] = 0
        balances[expense.payer] += expense.amount
    return jsonify(balances)

@app.route('/expenses-by-date', methods=['GET'])
def expenses_by_date():
    start_date = request.args.get('start')
    end_date = request.args.get('end')

    try:
        start_date = datetime.strptime(start_date, '%Y-%m-%d')
        end_date = datetime.strptime(end_date, '%Y-%m-%d')
    except ValueError:
        return jsonify({"error": "Invalid date format. Please use YYYY-MM-DD."}), 400

    expenses = Expense.query.filter(Expense.date >= start_date, Expense.date <= end_date).all()
    return jsonify([expense.as_dict() for expense in expenses])

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

@app.route('/delete-expense/<int:id>', methods=['DELETE'])
def delete_expense(id):
    try:
        expense = Expense.query.get(id)
        if not expense:
            return jsonify({"error": "Expense not found"}), 404
            
        deleted = DeletedExpense(
            original_id=expense.id,
            payer=expense.payer,
            amount=expense.amount,
            description=expense.description,
            category=expense.category,
            date=expense.date,
            username=expense.username,
            deleted_at=datetime.utcnow(),
            participants=expense.participants,
            list_id=expense.list_id
        )
        
        db.session.add(deleted)
        db.session.delete(expense)
        db.session.commit()
        
        return jsonify({"message": "Expense moved to trash"}), 200
    except SQLAlchemyError as e:
        db.session.rollback()
        print(f"Database error in delete_expense endpoint: {str(e)}")
        return jsonify({"error": "Database error occurred"}), 500
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting expense: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route('/register', methods=['POST', 'OPTIONS'])
def register():
    if request.method == 'OPTIONS':
        response = jsonify({'message': 'OK'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        return response

    data = request.get_json()
    if not data.get('username') or not data.get('password'):
        return jsonify({"error": "Username and password are required"}), 400
    if len(data['password']) < 3:
        return jsonify({"error": "Password must be at least 3 characters"}), 400
    
    hashed_password = generate_password_hash(data['password'], method='pbkdf2:sha256')
    new_user = User(username=data['username'], password=hashed_password)

    try:
        db.session.add(new_user)
        db.session.commit()
        return jsonify({"message": "User created successfully!"}), 201
    except SQLAlchemyError as e:
        db.session.rollback()
        print(f"Database error in register endpoint: {str(e)}")
        return jsonify({"error": "Database error occurred"}), 500
    except Exception as e:
        return jsonify({"error": "Username already exists"}), 400

@app.route('/login', methods=['POST', 'OPTIONS'])
def login():
    if request.method == 'OPTIONS':
        response = jsonify({'message': 'OK'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        return response

    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')

        user = User.query.filter_by(username=username).first()
        if user and check_password_hash(user.password, password):
            return jsonify({
                'message': 'Login successful!',
                'username': username
            }), 200
        else:
            return jsonify({
                'error': 'Invalid username or password'
            }), 401

    except SQLAlchemyError as e:
        print(f"Database error in login endpoint: {str(e)}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        print("Login error:", e)
        return jsonify({
            'error': 'Login failed'
        }), 500

@app.route('/categories', methods=['GET'])
def get_categories():
    try:
        username = request.args.get('username')
        list_id = request.args.get('list_id')
        
        if not username:
            return jsonify({"error": "Username required"}), 400
            
        query = Category.query.filter_by(username=username)
        if list_id:
            query = query.filter_by(list_id=list_id)
            
        categories = query.all()
        return jsonify([category.as_dict() for category in categories])
    except Exception as e:
        print(f"Error in categories endpoint: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/categories', methods=['POST'])
def add_category():
    try:
        data = request.get_json()
        new_category = Category(
            name=data['name'],
            username=data['username'],
            list_id=data['list_id']
        )
        db.session.add(new_category)
        db.session.commit()
        return jsonify(new_category.as_dict()), 201
    except SQLAlchemyError as e:
        db.session.rollback()
        print(f"Database error in add_category endpoint: {str(e)}")
        return jsonify({"error": "Database error occurred"}), 500
    except Exception as e:
        db.session.rollback()
        print(f"Error adding category: {str(e)}")
        return jsonify({"error": str(e)}), 500
    
@app.route('/payers/<int:id>', methods=['DELETE'])
def delete_payer(id):
    try:
        payer = Payer.query.get(id)
        if not payer:
            return jsonify({"error": "Payer not found"}), 404
            
        db.session.delete(payer)
        db.session.commit()
        return jsonify({"message": "Payer deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/categories/<int:id>', methods=['DELETE'])
def delete_category(id):
    try:
        category = Category.query.get(id)
        if not category:
            return jsonify({"error": "Category not found"}), 404
            
        db.session.delete(category)
        db.session.commit()
        return jsonify({"message": "Category deleted successfully"}), 200
    except SQLAlchemyError as e:
        db.session.rollback()
        print(f"Database error in delete_category endpoint: {str(e)}")
        return jsonify({"error": "Database error occurred"}), 500
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/trash', methods=['GET'])
def get_trash():
    username = request.args.get('username')
    list_id = request.args.get('list_id')
    
    if not username:
        return jsonify({"error": "Username required"}), 400
        
    query = DeletedExpense.query.filter_by(username=username)
    if list_id:
        query = query.filter_by(list_id=list_id)
        
    deleted = query.all()
    return jsonify([{
        'id': d.id,
        'original_id': d.original_id,
        'payer': d.payer,
        'amount': d.amount,
        'description': d.description,
        'category': d.category,
        'date': d.date.strftime('%Y-%m-%d'),
        'deleted_at': d.deleted_at.strftime('%Y-%m-%d %H:%M:%S'),
        'participants': d.participants.split(',') if d.participants else []
    } for d in deleted])

@app.route('/restore/<int:id>', methods=['POST'])
def restore_expense(id):
    try:
        deleted = DeletedExpense.query.get(id)
        if not deleted:
            return jsonify({"error": "Expense not found"}), 404

        expense = Expense(
            payer=deleted.payer,
            amount=deleted.amount,
            description=deleted.description,
            category=deleted.category,
            date=deleted.date,
            username=deleted.username,
            participants=deleted.participants,
            list_id=deleted.list_id
        )
        db.session.add(expense)
        db.session.delete(deleted)
        db.session.commit()
        return jsonify(expense.as_dict()), 200
    except SQLAlchemyError as e:
        db.session.rollback()
        print(f"Database error in restore_expense endpoint: {str(e)}")
        return jsonify({"error": "Database error occurred"}), 500
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
    
@app.route('/lists', methods=['GET'])
def get_lists():
    username = request.args.get('username')
    if not username:
        return jsonify({"error": "Username required"}), 400
    
    lists = ExpenseList.query.filter_by(created_by=username).all()
    return jsonify([list.as_dict() for list in lists])

@app.route('/lists', methods=['POST'])
def create_list():
    try:
        data = request.get_json()
        
        new_list = ExpenseList(
            name=data['name'],
            created_by=data['createdBy']
        )
        db.session.add(new_list)
        db.session.flush()  # Get ID before adding participants
        
        # Add participants
        for username in data.get('participants', []):
            participant = ListParticipant(
                list_id=new_list.id,
                username=username
            )
            db.session.add(participant)
        
        db.session.commit()
        return jsonify(new_list.as_dict()), 201
        
    except SQLAlchemyError as e:
        db.session.rollback()
        print(f"Database error in create_list endpoint: {str(e)}")
        return jsonify({"error": "Database error occurred"}), 500
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/lists', methods=['OPTIONS'])
def handle_lists_options():
    response = jsonify({'message': 'OK'})
    response.headers.add('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
    return response

@app.route('/lists/<int:list_id>', methods=['PUT'])
def update_list(list_id):
    try:
        data = request.get_json()
        expense_list = ExpenseList.query.get_or_404(list_id)
        expense_list.name = data['name']
        
        ListParticipant.query.filter_by(list_id=list_id).delete()
        for username in data['participants']:
            participant = ListParticipant(
                list_id=list_id,
                username=username
            )
            db.session.add(participant)
        
        db.session.commit()
        return jsonify(expense_list.as_dict())
    except SQLAlchemyError as e:
        db.session.rollback()
        print(f"Database error in update_list endpoint: {str(e)}")
        return jsonify({"error": "Database error occurred"}), 500
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
    
@app.route('/lists/<int:list_id>', methods=['DELETE'])
def delete_list(list_id):
    try:
        # Get the list first
        expense_list = ExpenseList.query.get_or_404(list_id)
        
        # Delete related records one by one with error checking
        try:
            # Delete participants
            ListParticipant.query.filter_by(list_id=list_id).delete()
            
            # Delete expenses (only if list_id column exists)
            if hasattr(Expense, 'list_id'):
                Expense.query.filter_by(list_id=list_id).delete()
            
            # Finally delete the list
            db.session.delete(expense_list)
            db.session.commit()
            
            return jsonify({"message": "List deleted successfully"}), 200
            
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": f"Error during deletion: {str(e)}"}), 500
            
    except SQLAlchemyError as e:
        db.session.rollback()
        print(f"Database error in delete_list endpoint: {str(e)}")
        return jsonify({"error": "Database error occurred"}), 500
    except Exception as e:
        return jsonify({"error": f"List not found or error occurred: {str(e)}"}), 404
    
@app.route('/lists/<int:list_id>', methods=['GET'])
def get_list(list_id):
    try:
        expense_list = ExpenseList.query.get(list_id)
        if not expense_list:
            return jsonify({'error': 'List not found'}), 404

        return jsonify(expense_list.as_dict()), 200

    except Exception as e:
        print(f"Error in get_list endpoint: {str(e)}")
        return jsonify({'error': 'Failed to fetch list data'}), 500
    
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    socketio.run(app, debug=True, port=5000)