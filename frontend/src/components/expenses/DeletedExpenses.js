import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { fetchTrash } from '../../api';

function DeletedExpenses({ currentUser, onRestore }) {
  const { theme } = useTheme();
  const [deletedExpenses, setDeletedExpenses] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (currentUser) {
      const loadTrash = async () => {
        try {
          const data = await fetchTrash(currentUser);

          setDeletedExpenses(data);
        } catch (error) {
          console.error('Error loading trash:', error);
          setError('Failed to load deleted expenses');
        }
      };

      loadTrash();
    }
  }, [currentUser]);

  const handleRestore = async (id) => {
    try {
      await onRestore(id); // Use parent's restore handler
      setDeletedExpenses(deletedExpenses.filter(exp => exp.id !== id));
    } catch (error) {
      setError('Failed to restore expense');
    }
  };

  return (
    <div style={{ color: theme.text }}>
      <h2>Deleted expenses</h2>
      {error && <p style={{ color: theme.error }}>{error}</p>}
      {deletedExpenses.length === 0 ? (
        <p>No deleted expenses found</p>
      ) : (
        <table className="expenses-table" style={{
          backgroundColor: theme.surface,
          width: '100%',
          borderCollapse: 'collapse'
        }}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Payer</th>
              <th>Amount</th>
              <th>Description</th>
              <th>Category</th>
              <th>Participants</th>
              <th>Deleted At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {deletedExpenses.map(expense => (
              <tr key={expense.id}>
                <td>{new Date(expense.date).toLocaleDateString()}</td>
                <td>{expense.payer}</td>
                <td>{expense.amount.toFixed(2)} €</td>
                <td>{expense.description}</td>
                <td>{expense.category}</td>
                <td>
                  {Array.isArray(expense.participants)
                    ? expense.participants.join(', ')
                    : expense.participants?.split(',').join(', ') || expense.payer}
                </td>
                <td>{expense.deleted_at}</td>
                <td>
                  <button
                    onClick={() => handleRestore(expense.id)}
                    style={{
                      backgroundColor: theme.primary,
                      color: '#fff',
                      border: 'none',
                      padding: '0.5rem',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Restore
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default DeletedExpenses;