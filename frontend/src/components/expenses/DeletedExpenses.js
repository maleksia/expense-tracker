import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { FaTrashRestore, FaFilter } from 'react-icons/fa';
import { useTheme } from '../../context/ThemeContext';
import { fetchTrash } from '../../api';
import { useCurrency } from '../../context/CurrencyContext';

function DeletedExpenses({ currentUser, onRestore, currentList }) {
  const { theme } = useTheme();
  const { listCurrencies } = useCurrency();
  const [deletedExpenses, setDeletedExpenses] = useState([]);
  const [error, setError] = useState('');
  const [selectedPayer, setSelectedPayer] = useState('');

  const currentCurrency = listCurrencies[currentList?.id] || 'EUR';

  useEffect(() => {
    const loadTrash = async () => {
      try {
        if (!currentList?.id) {
          console.log('No list ID available for deleted expenses');
          return;
        }

        console.log('Fetching deleted expenses for:', {
          currentUser,
          listId: currentList.id
        });

        const data = await fetchTrash(currentUser, currentList.id);
        setDeletedExpenses(data);
      } catch (error) {
        console.error('Error loading trash:', error);
        setError('Failed to load deleted expenses');
      }
    };

    loadTrash();
  }, [currentUser, currentList]);

  const handleRestore = async (id) => {
    try {
      await onRestore(id); // Use parent's restore handler
      setDeletedExpenses(deletedExpenses.filter(exp => exp.id !== id));
    } catch (error) {
      setError('Failed to restore expense');
    }
  };

  const filteredExpenses = deletedExpenses.filter(expense => 
    !selectedPayer || expense.payer === selectedPayer
  );

  return (
    <div className="component-container">
      <div className="component-header">
        <h2 className="component-title">Deleted Expenses</h2>
        
        <div style={{ 
          display: 'flex',
          gap: '8px',
          backgroundColor: theme.background,
          padding: '8px',
          borderRadius: '6px'
        }}>
          <FaFilter style={{ color: theme.textSecondary }} />
          <select
            value={selectedPayer}
            onChange={(e) => setSelectedPayer(e.target.value)}
            style={{
              backgroundColor: 'transparent',
              color: theme.text,
              border: 'none',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="">All Payers</option>
            {[...new Set(deletedExpenses.map(e => e.payer))].map(payer => (
              <option key={payer} value={payer}>{payer}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div style={{ 
          color: theme.error,
          backgroundColor: `${theme.error}15`,
          padding: '12px',
          borderRadius: '6px',
          marginBottom: '16px'
        }}>
          {error}
        </div>
      )}

      {filteredExpenses.length === 0 ? (
        <div style={{ 
          textAlign: 'center',
          padding: '32px',
          color: theme.textSecondary,
          backgroundColor: theme.currentTheme === 'dark' ? '#1a1a1a' : theme.background,
          borderRadius: '8px'
        }}>
          <p>No deleted expenses found</p>
        </div>
      ) : (
        <table className="expenses-table" style={{
          width: '100%',
          borderCollapse: 'separate',
          borderSpacing: '0'
        }}>
          <thead>
            <tr>
              {['Date', 'Description', 'Payer', 'Amount', 'Category', 'Deleted At', 'Actions'].map(header => (
                <th key={header} className="table-header" style={{
                  textAlign:'left'
                }}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredExpenses.map(expense => (
              <tr key={expense.id} className="expense-row">
                <td className="expense-cell">
                  {format(new Date(expense.date), 'dd.MM.yyyy')}
                </td>
                <td className="expense-cell">
                  {expense.description}
                </td>
                <td className="expense-cell">
                  {expense.payer}
                </td>
                <td className="expense-cell">
                  {new Intl.NumberFormat('fi-FI', {
                    style: 'currency',
                    currency: currentCurrency
                  }).format(expense.amount)}
                </td>
                <td className="expense-cell">
                  {expense.category}
                </td>
                <td className="expense-cell secondary">
                  {format(new Date(expense.deleted_at), 'dd.MM.yyyy HH:mm')}
                </td>
                <td className="expense-cell" style={{
                  padding: '12px 16px',
                  textAlign: 'left'
                }}>
                  <button
                    onClick={() => handleRestore(expense.id)}
                    style={{
                      backgroundColor: theme.primary,
                      color: '#fff',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'left',
                      gap: '8px',
                      fontSize: '0.9rem',
                      fontWeight: '500'
                    }}
                  >
                    <FaTrashRestore /> Restore
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