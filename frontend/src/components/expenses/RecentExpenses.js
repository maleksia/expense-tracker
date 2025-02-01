import React from 'react';
import AddExpenseForm from './AddExpenseForm';
import ExpenseList from './ExpenseList';
import DebtCalculator from './DebtCalculator';
import { useTheme } from '../../context/ThemeContext';

function RecentExpenses({ currentUser, currentList, expenses, handleAddExpense, handleDeleteExpense }) {
  const { theme } = useTheme();

  const handleEditExpense = (expense) => {
    // Implement edit functionality
    console.log('Edit expense:', expense);
  };

  return (
    <div style={{ color: theme.text }}>
      <h2>{currentList?.name || 'Loading...'}</h2>
      <AddExpenseForm
        onSubmit={handleAddExpense}
        currentUser={currentUser}
        currentList={currentList}
      />
      <ExpenseList
        expenses={expenses.sort((a, b) => new Date(b.date) - new Date(a.date))} // Sort by date descending
        onDelete={handleDeleteExpense}
        onEdit={handleEditExpense}
        currentList={currentList}
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