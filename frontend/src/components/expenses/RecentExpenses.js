import React from 'react';
import AddExpenseForm from './AddExpenseForm';
import ExpensesList from './ExpensesList';
import DebtCalculator from './DebtCalculator';

function RecentExpenses({ currentUser, expenses, handleAddExpense, handleDeleteExpense, currentList }) {
  const recentExpenses = expenses.slice(0, 5);

  return (
    <div>
      <h2>{currentList?.name || 'Loading...'}</h2>
      <AddExpenseForm
        onSubmit={handleAddExpense}
        currentUser={currentUser}
        currentList={currentList}
      />
      <ExpensesList
        expenses={recentExpenses}
        handleDeleteExpense={handleDeleteExpense}
      />
      <DebtCalculator
        expenses={expenses}
        currentUser={currentUser}
        currentList={currentList}
      />
    </div>
  );
}

export default RecentExpenses;