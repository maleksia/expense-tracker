import React from 'react';
import AddExpenseForm from './AddExpenseForm';
import ExpensesList from './ExpensesList';
import DebtCalculator from './DebtCalculator';

function RecentExpenses({ currentUser, expenses, handleAddExpense, handleDeleteExpense }) {
  const recentExpenses = expenses.slice(0, 5); // Get 5 most recent

  return (
    <div>
      <h2>Hello {currentUser}!</h2>
      <AddExpenseForm onSubmit={handleAddExpense} currentUser={currentUser} />
      <ExpensesList 
        expenses={recentExpenses} 
        handleDeleteExpense={handleDeleteExpense}
      />
      <DebtCalculator expenses={expenses} currentUser={currentUser} />
    </div>
  );
}

export default RecentExpenses;