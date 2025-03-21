import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from flask_socketio import SocketIO
from db import db
from models import User, Expense, Payer, Category, DeletedExpense, ExpenseList, ListParticipant, ListShareRequest, Changelog
from sqlalchemy.exc import SQLAlchemyError

app = Flask(__name__, static_folder='../frontend/build', static_url_path='/')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///expenses.db'
db.init_app(app)

CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:3000", "https://aleksi.pro"],
        "supports_credentials": True,
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "expose_headers": ["Content-Range", "X-Content-Range"]
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
        
    if list_id:
        expenses = Expense.query.filter_by(list_id=list_id).all()
    else:
        accessible_lists = db.session.query(ExpenseList.id).filter(
            db.or_(
                ExpenseList.created_by == username,
                ExpenseList.id.in_(
                    db.session.query(ListParticipant.list_id)
                    .filter(ListParticipant.username == username)
                )
            )
        )
        expenses = Expense.query.filter(Expense.list_id.in_(accessible_lists)).all()

    if not expenses:
        return {}
    
    # Calculate net balance for each participant based on expenses they're part of
    net_balances = {}
    
    for expense in expenses:
        if not expense.payer or not expense.participants:
            continue
            
        payer = expense.payer
        participants = expense.participants.split(',')
        participants = [p for p in participants if p and ':' in p]
        
        if not participants:
            continue
            
        # Calculate share per participant for this expense
        share = expense.amount / len(participants)
        
        # Initialize payer's balance if not exists
        if payer not in net_balances:
            net_balances[payer] = 0
            
        # Add full amount to payer's balance
        net_balances[payer] += expense.amount
        
        # Subtract shares from participants' balances
        for participant in participants:
            if participant not in net_balances:
                net_balances[participant] = 0
            net_balances[participant] -= share

    # Calculate debts based on net balances
    debts = {}
    
    # Convert net balances to list and sort
    sorted_participants = sorted(net_balances.items(), key=lambda x: x[1])
    
    i = 0  # index for debtors (negative balance)
    j = len(sorted_participants) - 1  # index for creditors (positive balance)
    
    while i < j:
        debtor = sorted_participants[i]
        creditor = sorted_participants[j]
        
        if debtor[1] >= 0:  # No longer a debtor
            i += 1
            continue
            
        if creditor[1] <= 0:  # No longer a creditor
            j -= 1
            continue
            
        # Calculate the debt amount
        debt_amount = min(abs(debtor[1]), creditor[1])
        
        # Add the debt to the result
        if debt_amount > 0:
            if debtor[0] not in debts:
                debts[debtor[0]] = {}
            debts[debtor[0]][creditor[0]] = round(debt_amount, 2)
        
        # Update balances
        sorted_participants[i] = (debtor[0], debtor[1] + debt_amount)
        sorted_participants[j] = (creditor[0], creditor[1] - debt_amount)
        
        # Move indices if balances are settled
        if abs(sorted_participants[i][1]) < 0.01:
            i += 1
        if abs(sorted_participants[j][1]) < 0.01:
            j -= 1

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

def log_action(list_id, action, username, details=None):
    changelog_entry = Changelog(list_id=list_id, action=action, username=username, details=details)
    db.session.add(changelog_entry)
    db.session.commit()

@app.route('/add-expense', methods=['POST'])
def add_expense():
    try:
        data = request.get_json()
        # Ensure payer has proper prefix
        if ':' not in data['payer']:
            data['payer'] = f"{data['payerType']}:{data['payer']}"
            
        # Create the expense with full identifiers
        new_expense = Expense(
            payer=data['payer'],
            amount=float(data['amount']),
            description=data['description'],
            category=data['category'],
            date=datetime.strptime(data['date'], '%Y-%m-%d') if 'date' in data else None,
            username=data['username'],
            participants=','.join(data['participants']),
            list_id=data['list_id']
        )
        db.session.add(new_expense)
        db.session.commit()
        expense_dict = new_expense.as_dict()
        expense_dict['participants'] = data.get('participants', [])
        # Update debts calculation with list_id
        debts = calculate_debts_internal(data['username'], data['list_id'])
        socketio.emit(f'expensesUpdated_{data["username"]}_{data["list_id"]}', debts)
        
        log_action(new_expense.list_id, f"User: {new_expense.username} | Added new expense \"{new_expense.description}\" ({new_expense.amount}€)", new_expense.username)
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
    if list_id:
        # First check if user has access to this list
        access = db.or_(
            ExpenseList.created_by == username,
            ListParticipant.username == username
        )
        list_access = db.session.query(ExpenseList).filter(
            ExpenseList.id == list_id,
            access
        ).join(ListParticipant, isouter=True).first()
        if not list_access:
            return jsonify({"error": "No access to this list"}), 403
        # Get all expenses for the list, regardless of who created them
        expenses = Expense.query.filter_by(list_id=list_id).all()
    else:
        # Get expenses from all lists user has access to
        accessible_lists = db.session.query(ExpenseList.id).filter(
            db.or_(
                ExpenseList.created_by == username,
                ExpenseList.id.in_(
                    db.session.query(ListParticipant.list_id)
                    .filter(ListParticipant.username == username)
                )
            )
        )
        expenses = Expense.query.filter(Expense.list_id.in_(accessible_lists)).all()
    return jsonify([expense.as_dict() for expense in expenses])

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
        
        log_action(expense.list_id, f"User: {expense.username} | Deleted expense \"{expense.description}\" ({expense.amount}€)", expense.username)
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
        
        log_action(expense.list_id, f"User: {expense.username} | Restored expense \"{expense.description}\" ({expense.amount}€)", expense.username)
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
    try:
        username = request.args.get('username')
        if not username:
            return jsonify({'error': 'Username required'}), 400
        # Get lists where user is either creator or participant
        lists = ExpenseList.query.filter(
            db.or_(
                ExpenseList.created_by == username,
                ExpenseList.id.in_(
                    db.session.query(ListParticipant.list_id)
                    .filter(ListParticipant.username == username)
                )
            )
        ).all()
        return jsonify([list.as_dict() for list in lists]), 200
    except Exception as e:
        print(f"Error in get_lists endpoint: {str(e)}")
        return jsonify({'error': str(e)}), 500

# First, add a helper function to standardize user processing
def process_participants(participants, creator=None):
    """
    Standardize participant processing across all list operations.
    Returns a list of participants with proper prefixes.
    """
    processed = []
    
    # First process all non-registered participants
    for participant in participants:
        if ':' not in participant:  # Only process raw names
            processed.append(f"nonRegistered:{participant}")
    
    # Then add creator if included
    if creator:
        processed.append(f"registered:{creator}")
    
    return processed

@app.route('/lists', methods=['POST'])
def create_list():
    try:
        data = request.get_json()
        creator = data['createdBy']
        include_creator = data.get('includeCreator', True)
        participants = data.get('participants', [])
        
        # Process participants and include creator if needed
        processed_participants = process_participants(
            participants,
            creator if include_creator else None
        )

        if not processed_participants:
            return jsonify({"error": "List must have at least one participant"}), 400

        new_list = ExpenseList(
            name=data['name'],
            created_by=creator,
            participants=','.join(processed_participants)
        )
        db.session.add(new_list)
        db.session.flush()

        # If creator should be included, add them as a registered participant
        if include_creator:
            creator_participant = ListParticipant(
                list_id=new_list.id,
                username=creator,
                role='owner'
            )
            db.session.add(creator_participant)
        # Add share requests for other registered users
        for username in data.get('sharedWith', []):
            if username != creator:
                share_request = ListShareRequest(
                    list_id=new_list.id,
                    from_user=creator,
                    to_user=username,
                    status='pending',
                    message=f'Added you while creating the list "{data["name"]}"'
                )
                db.session.add(share_request)
        db.session.commit()
        
        log_action(new_list.id, f"User: {creator} | Created new list \"{new_list.name}\"", creator)
        return jsonify(new_list.as_dict()), 201
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

        # Validate that there's at least one participant or shared user
        if not data.get('participants') and not data.get('sharedWith'):
            return jsonify({"error": "List must have at least one participant or shared user"}), 400

        # Update list name and non-registered participants
        old_name = expense_list.name
        expense_list.name = data['name']
        if 'participants' in data:  # Only update participants if provided
            processed_participants = process_participants(
                data['participants'],
                expense_list.created_by
            )
            expense_list.participants = ','.join(processed_participants)

        # Add new share requests for registered users
        for username in data.get('sharedWith', []):
            existing_request = ListShareRequest.query.filter_by(
                list_id=list_id,
                to_user=username,
                status='pending'
            ).first()
            
            if not existing_request:
                share_request = ListShareRequest(
                    list_id=list_id,
                    from_user=expense_list.created_by,
                    to_user=username,
                    status='pending',
                    message=f'Added you while editing the list "{data["name"]}"'
                )
                db.session.add(share_request)

        db.session.commit()
        
        log_action(list_id, f"User: {expense_list.created_by} | Updated list name: \"{old_name}\" → \"{expense_list.name}\"", expense_list.created_by)
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
            log_action(list_id, f"User: {expense_list.created_by} | Deleted list \"{expense_list.name}\"", expense_list.created_by)
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

@app.route('/lists/<int:list_id>/share', methods=['POST'])
def share_list(list_id):
    try:
        data = request.get_json()
        to_username = data.get('username')
        from_username = data.get('from_username')
        message = data.get('message', '')

        if not from_username:
            return jsonify({'error': 'From username is required'}), 400

        # Check if user exists
        user = User.query.filter_by(username=to_username).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Don't allow sharing with self
        if to_username == from_username:
            return jsonify({'error': 'Cannot share list with yourself'}), 400

        # Check if already shared or pending
        existing_participant = ListParticipant.query.filter_by(
            list_id=list_id,
            username=to_username
        ).first()
        if existing_participant:
            return jsonify({'error': 'List already shared with this user'}), 400

        existing_request = ListShareRequest.query.filter_by(
            list_id=list_id,
            to_user=to_username,
            status='pending'
        ).first()
        if existing_request:
            return jsonify({'error': 'Share request already pending'}), 400

        # Create share request
        share_request = ListShareRequest(
            list_id=list_id,
            from_user=from_username,
            to_user=to_username,
            status='pending',
            message=message
        )
        db.session.add(share_request)
        db.session.commit()
        
        log_action(list_id, f"User: {from_username} | Shared list with {to_username}", from_username)
        return jsonify({'message': 'Share request sent successfully'}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error in share_list endpoint: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/share-requests', methods=['GET'])
def get_share_requests():
    username = request.args.get('username')
    if not username:
        return jsonify({'error': 'Username required'}), 400
    requests = ListShareRequest.query.filter_by(
        to_user=username,
        status='pending'
    ).all()
    return jsonify([req.as_dict() for req in requests]), 200

@app.route('/share-requests/<int:request_id>/respond', methods=['POST'])
def respond_to_share_request(request_id):
    try:
        data = request.get_json()
        accept = data.get('accept', False)
        share_request = ListShareRequest.query.get_or_404(request_id)
        share_request.status = 'accepted' if accept else 'rejected'
        
        if accept:
            # Add user as participant to both ListParticipant and ExpenseList
            participant = ListParticipant(
                list_id=share_request.list_id,
                username=share_request.to_user,
                role='member'
            )
            db.session.add(participant)
            
            # Update ExpenseList participants
            expense_list = ExpenseList.query.get(share_request.list_id)
            if expense_list:
                current_participants = expense_list.participants.split(',') if expense_list.participants else []
                new_participant = f"registered:{share_request.to_user}"
                if new_participant not in current_participants:
                    current_participants.append(new_participant)
                    expense_list.participants = ','.join(current_participants)

            # Recalculate debts for the list and emit to all participants
            list_participants = set()
            list_participants.add(share_request.to_user)  # Add new participant
            # Get all current participants
            for p in ListParticipant.query.filter_by(list_id=share_request.list_id).all():
                list_participants.add(p.username)
            # Get list creator
            expense_list = ExpenseList.query.get(share_request.list_id)
            if expense_list:
                list_participants.add(expense_list.created_by)
            
            # Calculate and emit debts for all participants
            for username in list_participants:
                debts = calculate_debts_internal(username, share_request.list_id)
                socketio.emit(f'expensesUpdated_{username}_{share_request.list_id}', debts)
        db.session.commit()
        return jsonify({
            'message': f'Share request {"accepted" if accept else "rejected"} successfully'
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/users/check', methods=['GET'])
def check_user():
    username = request.args.get('username')
    if not username:
        return jsonify({'error': 'Username is required'}), 400
    user = User.query.filter_by(username=username).first()
    return jsonify({'exists': user is not None})

@app.route('/update-expense/<int:id>', methods=['PUT', 'OPTIONS'])
def update_expense(id):
    if request.method == 'OPTIONS':
        response = jsonify({'message': 'OK'})
        response.headers.add('Access-Control-Allow-Methods', 'PUT, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        return response
        
    try:
        data = request.get_json()
        expense = Expense.query.get_or_404(id)
        
        # Ensure payer has proper prefix
        if ':' not in data['payer']:
            data['payer'] = f"{data['payerType']}:{data['payer']}"

        # Store old values before update
        old_description = expense.description
        old_amount = expense.amount
        old_category = expense.category
        old_payer = expense.payer

        # Update expense fields
        expense.payer = data['payer']
        expense.amount = float(data['amount'])
        expense.description = data['description']
        expense.category = data['category']
        expense.date = datetime.strptime(data['date'], '%Y-%m-%d')
        expense.participants = ','.join(data['participants'])

        db.session.commit()
        
        # Return the updated expense with proper format
        expense_dict = expense.as_dict()
        expense_dict['participants'] = data['participants']  # Use the processed participants
        
        # Recalculate debts and emit update
        debts = calculate_debts_internal(data['username'], data['list_id'])
        socketio.emit(f'expensesUpdated_{data["username"]}_{data["list_id"]}', debts)
        
        changes = []
        if old_description != expense.description:
            changes.append(f"Description: {old_description} → {expense.description}")
        if old_amount != expense.amount:
            changes.append(f"Amount: {old_amount} → {expense.amount}")
        if old_category != expense.category:
            changes.append(f"Category: {old_category} → {expense.category}")
        if old_payer != expense.payer:
            changes.append(f"Payer: {old_payer} → {expense.payer}")
        
        change_text = " | ".join(changes)
        log_action(expense.list_id, f"User: {expense.username} | Updated expense (ID: {expense.id}) | {change_text}", expense.username)
        return jsonify(expense_dict), 200
    except SQLAlchemyError as e:
        db.session.rollback()
        print(f"Database error in update_expense endpoint: {str(e)}")
        return jsonify({"error": "Database error occurred"}), 500
    except Exception as e:
        db.session.rollback()
        print(f"Error in update_expense: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/changelog/<int:list_id>', methods=['GET'])
def get_changelog(list_id):
    changelog_entries = Changelog.query.filter_by(list_id=list_id).order_by(Changelog.timestamp.desc()).all()
    return jsonify([{
        "id": entry.id,
        "action": entry.action,
        "timestamp": entry.timestamp,
        "username": entry.username
    } for entry in changelog_entries]), 200

@app.route('/remove-user/<int:list_id>/<username>', methods=['DELETE'])
def remove_user_from_list(list_id, username):
    try:
        participant = ListParticipant.query.filter_by(list_id=list_id, username=username).first()
        if not participant:
            return jsonify({"error": "User not found in list"}), 404
        db.session.delete(participant)
        db.session.commit()
        
        log_action(list_id, f"User: {participant.username} | Removed {username} from list", participant.username)
        return jsonify({"message": "User removed from list successfully"}), 200
    except SQLAlchemyError as e:
        db.session.rollback()
        print(f"Database error in remove_user_from_list endpoint: {str(e)}")
        return jsonify({"error": "Database error occurred"}), 500
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    with app.app_context():
        try:
            db.create_all()
            print("Database tables created successfully")
        except Exception as e:
            print(f"Error creating database tables: {str(e)}")
    socketio.run(app, debug=True, port=5000)