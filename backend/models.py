from db import db
from datetime import datetime
from flask import Flask, request, jsonify
from sqlalchemy.exc import SQLAlchemyError

app = Flask(__name__)

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)

class Expense(db.Model):
    __tablename__ = 'expenses'
    id = db.Column(db.Integer, primary_key=True)
    payer = db.Column(db.String(100), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    description = db.Column(db.String(200))
    category = db.Column(db.String(100))
    date = db.Column(db.DateTime, default=datetime.utcnow)
    username = db.Column(db.String(150), db.ForeignKey('users.username', ondelete='CASCADE'), nullable=False)
    participants = db.Column(db.String(500))
    list_id = db.Column(db.Integer, db.ForeignKey('expense_lists.id', ondelete='CASCADE'), nullable=False)

    user = db.relationship('User', backref='expenses')

    def as_dict(self):
        return {
            'id': self.id,
            'payer': self.payer,
            'amount': self.amount,
            'description': self.description,
            'category': self.category,
            'date': self.date.strftime('%Y-%m-%d'),
            'participants': self.participants.split(',') if self.participants else [],
            'list_id': self.list_id,
            'username': self.username
        }

class Payer(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    username = db.Column(db.String(150), nullable=False)

    def as_dict(self):
        return {
            'id': self.id,
            'name': self.name
        }

class Category(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    username = db.Column(db.String(150), nullable=False)
    list_id = db.Column(db.Integer, db.ForeignKey('expense_lists.id'))

    def as_dict(self):
        return {
            'id': self.id,
            'name': self.name
        }

class DeletedExpense(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    original_id = db.Column(db.Integer)
    payer = db.Column(db.String(100), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    description = db.Column(db.String(200))
    category = db.Column(db.String(100))
    date = db.Column(db.DateTime, default=datetime.utcnow)
    username = db.Column(db.String(150), nullable=False)
    deleted_at = db.Column(db.DateTime, default=datetime.utcnow)
    participants = db.Column(db.String(500))
    list_id = db.Column(db.Integer, db.ForeignKey('expense_lists.id'))

    def as_dict(self):
        return {
            'id': self.id,
            'original_id': self.original_id,
            'payer': self.payer,
            'amount': self.amount,
            'description': self.description,
            'category': self.category,
            'date': self.date.strftime('%Y-%m-%d'),
            'deleted_at': self.deleted_at.strftime('%Y-%m-%d %H:%M:%S'),
            'participants': self.participants.split(',') if self.participants else [],
            'list_id': self.list_id
        }
    
class ExpenseList(db.Model):
    __tablename__ = 'expense_lists'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    created_by = db.Column(db.String(50), db.ForeignKey('users.username'), nullable=False)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    participants = db.Column(db.String(500))
    registered_participants = db.relationship('ListParticipant', backref='list', lazy=True)

    def as_dict(self):
        registered_participants = [
            username for username in 
            self.participants.split(',') if username.startswith('registered:')
        ]
        non_registered_participants = [
            username for username in 
            self.participants.split(',') if username.startswith('nonRegistered:')
        ]
        
        return {
            'id': self.id,
            'name': self.name,
            'created_by': self.created_by,
            'registered_participants': [p.split(':')[1] for p in registered_participants],
            'non_registered_participants': [p.split(':')[1] for p in non_registered_participants],
            'participants': self.participants,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }

class ListParticipant(db.Model):
    __tablename__ = 'list_participants'
    id = db.Column(db.Integer, primary_key=True)
    list_id = db.Column(db.Integer, db.ForeignKey('expense_lists.id', ondelete='CASCADE'), nullable=False)
    username = db.Column(db.String(50), db.ForeignKey('users.username', ondelete='CASCADE'), nullable=False)
    role = db.Column(db.String(20), default='member')
    date_added = db.Column(db.DateTime, default=db.func.current_timestamp())

class ListShareRequest(db.Model):
    __tablename__ = 'list_share_requests'
    id = db.Column(db.Integer, primary_key=True)
    list_id = db.Column(db.Integer, db.ForeignKey('expense_lists.id', ondelete='CASCADE'), nullable=False)
    from_user = db.Column(db.String(50), db.ForeignKey('users.username', ondelete='CASCADE'), nullable=False)
    to_user = db.Column(db.String(50), db.ForeignKey('users.username', ondelete='CASCADE'), nullable=False)
    status = db.Column(db.String(20), default='pending')  # pending, accepted, rejected
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    message = db.Column(db.String(500))
    
    def as_dict(self):
        expense_list = ExpenseList.query.get(self.list_id)
        return {
            'id': self.id,
            'list_id': self.list_id,
            'list_name': expense_list.name if expense_list else None,
            'from_user': self.from_user,
            'to_user': self.to_user,
            'status': self.status,
            'created_at': self.created_at.isoformat(),
            'message': self.message
        }

class ListDeletionRequest(db.Model):
    __tablename__ = 'list_deletion_requests'
    id = db.Column(db.Integer, primary_key=True)
    list_id = db.Column(db.Integer, db.ForeignKey('expense_lists.id'), nullable=False)
    requested_by = db.Column(db.String(50), db.ForeignKey('users.username'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(20), default='pending')  # pending, approved, rejected

    def as_dict(self):
        return {
            'id': self.id,
            'list_id': self.list_id,
            'requested_by': self.requested_by,
            'created_at': self.created_at.isoformat(),
            'status': self.status
        }

class ListDeletionApproval(db.Model):
    __tablename__ = 'list_deletion_approvals'
    id = db.Column(db.Integer, primary_key=True)
    request_id = db.Column(db.Integer, db.ForeignKey('list_deletion_requests.id'), nullable=False)
    username = db.Column(db.String(50), db.ForeignKey('users.username'), nullable=False)
    approved = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def as_dict(self):
        return {
            'id': self.id,
            'request_id': self.request_id,
            'username': self.username,
            'approved': self.approved,
            'created_at': self.created_at.isoformat()
        }

class Changelog(db.Model):
    __tablename__ = 'changelog'
    id = db.Column(db.Integer, primary_key=True)
    list_id = db.Column(db.Integer, db.ForeignKey('expense_lists.id', ondelete='CASCADE'), nullable=False)
    action = db.Column(db.String(200), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    username = db.Column(db.String(150), db.ForeignKey('users.username', ondelete='CASCADE'), nullable=False)
    details = db.Column(db.JSON, nullable=True)

def log_action(list_id, action, username):
    new_log = Changelog(
        list_id=list_id,
        action=action,
        username=username,
        timestamp=datetime.utcnow()
    )
    db.session.add(new_log)
    db.session.commit()

@app.route('/add-expense', methods=['POST'])
def add_expense():
    try:
        data = request.get_json()
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
        log_action(new_expense.list_id, f"Added expense: {new_expense.description}", new_expense.username)
        return jsonify(new_expense.as_dict()), 201
    except SQLAlchemyError as e:
        db.session.rollback()
        print(f"Database error in add_expense endpoint: {str(e)}")
        return jsonify({"error": "Database error occurred"}), 500
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

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
        log_action(expense.list_id, f"Deleted expense: {expense.description}", expense.username)
        return jsonify({"message": "Expense moved to trash"}), 200
    except SQLAlchemyError as e:
        db.session.rollback()
        print(f"Database error in delete_expense endpoint: {str(e)}")
        return jsonify({"error": "Database error occurred"}), 500
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting expense: {str(e)}")
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