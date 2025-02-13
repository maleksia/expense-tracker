import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from flask_socketio import SocketIO
from db import db
from models import User, Expense, Payer, Category, DeletedExpense, ExpenseList, ListParticipant, ListShareRequest, ListDeletionRequest, ListDeletionApproval
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
        
    if list_id:
        # Get all expenses for the list, regardless of who created them
        expenses = Expense.query.filter_by(list_id=list_id).all()
    else:
        # Get expenses from all accessible lists
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
        
        # Process prefixed participants
        participants = data.get('participants', [])
        processed_participants = []
        
        for participant in participants:
            # Split the type prefix from the name
            parts = participant.split(':')
            if len(parts) == 2:
                participant_type, name = parts
                processed_participants.append(name)
            else:
                processed_participants.append(participant)
        
        participants_str = ','.join(processed_participants)
        
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
        expense_dict['participants'] = processed_participants
        
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

@app.route('/lists', methods=['POST'])
def create_list():
    try:
        data = request.get_json()
        creator = data['createdBy']
        include_creator = data.get('includeCreator', True)
        participants = list(set(data.get('participants', [])))
        
        # Validate that there's at least one participant (including creator if included)
        if not participants and not include_creator:
            return jsonify({"error": "List must have at least one participant"}), 400

        new_list = ExpenseList(
            name=data['name'],
            created_by=creator,
            participants=','.join(p for p in participants if p != creator)  # Exclude creator from non-registered
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

        expense_list.name = data['name']
        expense_list.participants = ','.join(data['participants']) if data.get('participants') else ''
        
        # Don't delete existing participants, just add new share requests
        existing_participants = set(p.username for p in ListParticipant.query.filter_by(list_id=list_id).all())

        # Add new share requests only for users who aren't already participants
        for username in data.get('sharedWith', []):
            if username not in existing_participants:
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
        return jsonify(expense_list.as_dict())

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
    
@app.route('/lists/<int:list_id>', methods=['DELETE'])
def delete_list(list_id):
    try:
        # Get the list
        expense_list = ExpenseList.query.get_or_404(list_id)
        requested_by = request.args.get('username')
        
        if not requested_by:
            return jsonify({'error': 'Username required'}), 400

        # Count registered users
        registered_users = ListParticipant.query.filter_by(list_id=list_id).count()
        if registered_users > 1:
            # Create deletion request
            deletion_request = ListDeletionRequest(
                list_id=list_id,
                requested_by=requested_by
            )
            db.session.add(deletion_request)
            db.session.commit()

            # Create pending approvals for all participants except requester
            participants = ListParticipant.query.filter(
                ListParticipant.list_id == list_id,
                ListParticipant.username != requested_by
            ).all()

            for participant in participants:
                approval = ListDeletionApproval(
                    request_id=deletion_request.id,
                    username=participant.username
                )
                db.session.add(approval)

            db.session.commit()
            return jsonify({
                'message': 'Deletion request created, waiting for approvals',
                'request_id': deletion_request.id
            }), 202
        else:
            # If only one user, delete immediately
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

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/lists/<int:list_id>/deletion-requests', methods=['GET'])
def get_deletion_requests(list_id):
    try:
        requests = ListDeletionRequest.query.filter_by(
            list_id=list_id,
            status='pending'
        ).all()
        return jsonify([req.as_dict() for req in requests]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/deletion-requests/<int:request_id>/approve', methods=['POST'])
def approve_deletion_request(request_id):
    try:
        data = request.get_json()
        username = data.get('username')
        approved = data.get('approved', False)

        if not username:
            return jsonify({'error': 'Username required'}), 400

        # Update approval
        approval = ListDeletionApproval.query.filter_by(
            request_id=request_id,
            username=username
        ).first()

        if not approval:
            return jsonify({'error': 'Approval request not found'}), 404

        approval.approved = approved
        
        # If rejected, mark the deletion request as rejected
        deletion_request = ListDeletionRequest.query.get(request_id)
        if not approved:
            deletion_request.status = 'rejected'
            db.session.commit()
            return jsonify({'message': 'Deletion request rejected'}), 200

        db.session.commit()

        # Check if all participants have approved
        all_approvals = ListDeletionApproval.query.filter_by(request_id=request_id).all()
        
        if all(a.approved for a in all_approvals):
            # Delete the list
            expense_list = ExpenseList.query.get(deletion_request.list_id)
            if expense_list:
                # Delete related records one by one with error checking
                try:
                    # Delete participants
                    ListParticipant.query.filter_by(list_id=expense_list.id).delete()
                    
                    # Delete expenses (only if list_id column exists)
                    if hasattr(Expense, 'list_id'):
                        Expense.query.filter_by(list_id=expense_list.id).delete()
                    
                    # Finally delete the list
                    db.session.delete(expense_list)
                    db.session.commit()
                    
                    deletion_request.status = 'approved'
                    db.session.commit()
                    return jsonify({"message": "List deleted successfully"}), 200
                    
                except Exception as e:
                    db.session.rollback()
                    return jsonify({"error": f"Error during deletion: {str(e)}"}), 500
        
        return jsonify({'message': 'Approval recorded'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

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
        message = data.get('message', '')  # Get optional message

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
            # Add user as participant
            participant = ListParticipant(
                list_id=share_request.list_id,
                username=share_request.to_user,
                role='member'
            )
            db.session.add(participant)
            
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

if __name__ == '__main__':
    with app.app_context():
        try:
            db.create_all()
            print("Database tables created successfully")
        except Exception as e:
            print(f"Error creating database tables: {str(e)}")
    socketio.run(app, debug=True, port=5000)