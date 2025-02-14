import React, { useState } from 'react';
import AddExpenseForm from './AddExpenseForm';
import ExpenseList from './ExpenseList';
import DebtCalculator from './DebtCalculator';
import { useTheme } from '../../context/ThemeContext';
import { updateExpense, fetchExpenses } from '../../api';

function RecentExpenses({ currentUser, currentList, expenses, handleAddExpense, handleDeleteExpense, setExpenses }) {
  const { theme } = useTheme();
  const [editingExpense, setEditingExpense] = useState(null);
  const [error, setError] = useState('');

  const handleEditExpense = (expense) => {
    setEditingExpense(expense);
  };

  const handleEditComplete = async (updatedData) => {
    try {
      await updateExpense(editingExpense.id, {
        ...updatedData,
        username: currentUser,
        list_id: currentList.id
      });
      
      // Refresh expenses list
      const updatedExpenses = await fetchExpenses(currentUser, currentList.id);
      setExpenses(updatedExpenses);
      
      setEditingExpense(null);
      setError('');
    } catch (error) {
      setError('Failed to update expense');
    }
  };

  return (
    <div style={{ color: theme.text }}>
      <h2>{currentList?.name || 'Loading...'}</h2>
      
      {error && (
        <div style={{ color: theme.error, marginBottom: '16px' }}>
          {error}
        </div>
      )}
      
      <AddExpenseForm
        onSubmit={editingExpense ? handleEditComplete : handleAddExpense}
        currentUser={currentUser}
        currentList={currentList}
        initialData={editingExpense}
        onCancel={editingExpense ? () => setEditingExpense(null) : null}
      />

      <ExpenseList
        expenses={expenses.sort((a, b) => new Date(b.date) - new Date(a.date))}
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