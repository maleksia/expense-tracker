from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from flask_socketio import SocketIO
from db import db
from models import User, Expense, Payer, Category, DeletedExpense

app = Flask(__name__, static_folder='build', static_url_path='')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///expenses.db'
db.init_app(app)
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:3000"],
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
            print("Received payer data:", data)  # Debug log

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
        response.headers.add("Access-Control-Allow-Methods", "GET, POST, OPTIONS, DELETE")
        response.headers.add("Access-Control-Allow-Credentials", "true")
        return response
    
def calculate_debts_internal(username=None):
    if not username:
        return {}
        
    expenses = Expense.query.filter_by(username=username).all()
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
    debts = calculate_debts_internal(username)
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
        
        # Convert participants list to string for storage
        participants_str = ','.join(data.get('participants', []))
        
        new_expense = Expense(
            payer=data['payer'],
            amount=float(data['amount']),
            description=data['description'],
            category=data['category'],
            date=datetime.strptime(data['date'], '%Y-%m-%d') if 'date' in data else None,
            username=data['username'],
            participants=participants_str
        )
        
        db.session.add(new_expense)
        db.session.commit()
        
        # Convert back to list for response
        expense_dict = new_expense.as_dict()
        expense_dict['participants'] = data.get('participants', [])
        
        # Recalculate debts
        debts = calculate_debts_internal(data['username'])
        socketio.emit(f'expensesUpdated_{data["username"]}', debts)
        
        return jsonify(expense_dict), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@app.route('/expenses', methods=['GET'])
def get_expenses():
    try:
        username = request.args.get('username')

        if not username:
            return jsonify({"error": "Username is required"}), 400

        expenses = Expense.query.filter_by(username=username).all()

        return jsonify([expense.as_dict() for expense in expenses])
    except Exception as e:
        return jsonify({"error": "Failed to fetch expenses", "details": str(e)}), 500




@app.route('/')
def index():
    return app.send_static_file('index.html')


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

    # Varmista, että päivämäärät on annettu oikeassa muodossa
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
            participants=expense.participants
        )
        
        db.session.add(deleted)
        db.session.delete(expense)
        db.session.commit()
        
        return jsonify({"message": "Expense moved to trash"}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting expense: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/register', methods=['POST', 'OPTIONS'])
def register():
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
    except Exception as e:
        return jsonify({"error": "Username already exists"}), 400

@app.route('/login', methods=['POST', 'OPTIONS'])
def login():
    if request.method == 'OPTIONS':
        # Handle preflight request
        response = jsonify({'message': 'OK'})
        response.headers.add('Access-Control-Allow-Methods', 'POST')
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

    except Exception as e:
        print("Login error:", e)
        return jsonify({
            'error': 'Login failed'
        }), 500

@app.route('/categories', methods=['OPTIONS', 'GET', 'POST'])
def categories():
    if request.method == 'OPTIONS':
        response = jsonify({'message': 'OK'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        return response

    try:
        if request.method == 'POST':
            data = request.get_json()
            print("Received category data:", data)

            if not data:
                return jsonify({'error': 'No data provided'}), 400
            
            new_category = Category(
                name=data['name'],
                username=data['username']
            )
            db.session.add(new_category)
            db.session.commit()
            
            return jsonify({
                'id': new_category.id,
                'name': new_category.name
            }), 201

        # GET request
        username = request.args.get('username')
        if not username:
            return jsonify({'error': 'Username parameter is required'}), 400
            
        categories = Category.query.filter_by(username=username).all()
        return jsonify([{
            'id': c.id,
            'name': c.name
        } for c in categories])

    except Exception as e:
        db.session.rollback()
        print(f"Error in categories endpoint: {str(e)}")
        return jsonify({'error': str(e)}), 500
    
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
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/trash', methods=['GET'])
def get_trash():
    username = request.args.get('username')
    if not username:
        return jsonify({"error": "Username is required"}), 400
        
    deleted = DeletedExpense.query.filter_by(username=username).all()
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
            participants=deleted.participants
        )
        db.session.add(expense)
        db.session.delete(deleted)
        db.session.commit()
        return jsonify(expense.as_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    socketio.run(app, debug=True, port=5000)