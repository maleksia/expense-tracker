import React, { useState } from 'react';
import AddExpenseForm from './AddExpenseForm';
import ExpenseList from './ExpenseList';
import DebtCalculator from './DebtCalculator';
import { useTheme } from '../../context/ThemeContext';
import { updateExpense, fetchExpenses } from '../../api';
import { FaUsers, FaUserCog } from 'react-icons/fa';

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
      <div style={{
        backgroundColor: theme.surface,
        padding: '24px',
        borderRadius: '12px',
        marginBottom: '24px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        border: `1px solid ${theme.border}`
      }}>
        <h1 style={{
          color: theme.textHighlight,
          fontSize: '2rem',
          marginBottom: '12px',
          fontWeight: '600'
        }}>
          {'Current list: '}{currentList?.name || 'Loading...'}
        </h1>
        
        <div style={{
          display: 'flex',
          gap: '24px',
          color: theme.textSecondary,
          fontSize: '0.9rem',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FaUsers />
            <span>
              {currentList?.registered_participants?.length || 0} registered, 
              {' '}
              {currentList?.non_registered_participants?.length || 0} non-registered
            </span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FaUserCog />
            <span>Owner: {currentList?.created_by}</span>
          </div>
        </div>
      </div>

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