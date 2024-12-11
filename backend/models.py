from db import db
from datetime import datetime

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)

class Expense(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    payer = db.Column(db.String(100), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    description = db.Column(db.String(200))
    category = db.Column(db.String(100))
    date = db.Column(db.DateTime, default=datetime.utcnow)
    username = db.Column(db.String(150), db.ForeignKey('user.username'), nullable=False)
    participants = db.Column(db.String(500))
    list_id = db.Column(db.Integer, db.ForeignKey('expense_list.id'), nullable=False)

    user = db.relationship('User', backref='expenses')

    def as_dict(self):
        return {
            'id': self.id,
            'payer': self.payer,
            'amount': self.amount,
            'description': self.description,
            'category': self.category,
            'date': self.date.strftime('%Y-%m-%d'),
            'participants': self.participants.split(',') if self.participants else []
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
    list_id = db.Column(db.Integer, db.ForeignKey('expense_list.id'))

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
    list_id = db.Column(db.Integer, db.ForeignKey('expense_list.id'))

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
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    created_by = db.Column(db.String(150), db.ForeignKey('user.username'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def as_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'created_by': self.created_by,
            'createdAt': self.created_at.isoformat(),
            'participants': [p.username for p in ListParticipant.query.filter_by(list_id=self.id).all()]
        }

class ListParticipant(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    list_id = db.Column(db.Integer, db.ForeignKey('expense_list.id'), nullable=False)
    username = db.Column(db.String(150), db.ForeignKey('user.username'), nullable=False)
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)