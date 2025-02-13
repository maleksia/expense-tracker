import React from 'react';
import { format } from 'date-fns';
import { FaPencilAlt, FaTrash, FaArrowRight, FaUserCog } from 'react-icons/fa';
import { useTheme } from '../../context/ThemeContext';
import { useCurrency } from '../../context/CurrencyContext';
import { Link, useParams } from 'react-router-dom';

function ExpenseList({ expenses, onDelete, onEdit, currentList }) {
  const { theme } = useTheme();
  const { listId } = useParams();
  const { listCurrencies } = useCurrency();

  const currentCurrency = listCurrencies[currentList?.id] || 'EUR';

  const containerStyle = {
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text)',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.2)',
    border: '1px solid var(--color-border)',
    marginBottom: '32px'
  };

  const tableStyle = {
    backgroundColor: 'var(--color-background)',
    width: '100%',
    borderCollapse: 'separate',
    borderSpacing: '0',
    padding: '20px'
  };

  const headerStyle = {
    borderBottom: `1px solid ${theme.border}`,
    padding: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  };

  const titleStyle = {
    color: theme.textHighlight,
    fontSize: '2rem',
    fontWeight: '600',
    margin: 0
  };

  // Take only 5 most recent expenses
  const recentExpenses = expenses.slice(0, 5);

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('fi-FI', {
      style: 'currency',
      currency: currentCurrency
    }).format(amount);
  };

  const renderParticipant = (participant) => {
    const isRegistered = currentList.registered_participants?.includes(participant);
    
    return (
      <span
        key={participant}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          backgroundColor: isRegistered ? `${theme.primary}15` : theme.surface,
          padding: '2px 8px',
          borderRadius: '12px',
          margin: '0 4px',
          fontSize: '0.9rem'
        }}
      >
        {isRegistered && <FaUserCog size={12} color={theme.primary} />}
        {participant}
      </span>
    );
  };

  if (!expenses || expenses.length === 0) {
    return (
      <div className="card-container" style={containerStyle}>
        <div className="section-header" style={headerStyle}>
          <h2 style={titleStyle}>Recent Expenses</h2>
        </div>
        <div style={{
          textAlign: 'center',
          padding: '32px',
          color: theme.textSecondary,
          backgroundColor: theme.currentTheme === 'dark' ? '#1a1a1a' : theme.background,
          borderRadius: '8px',
          margin: '20px'
        }}>
          <h3>No expenses yet</h3>
          <p>Start by adding your first expense to this list.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="component-container">
      <div className="component-header">
        <h2 className="component-title">Recent Expenses</h2>

        <Link
          to={`/list/${listId}/all`}
          className="view-all-link"
        >
          View All <FaArrowRight />
        </Link>
      </div>

      <table className="expenses-table" style={tableStyle}>
        <thead>
          <tr>
            {['Payer', 'Date', 'Description', 'Amount', 'Participants', 'Actions'].map((header) => (
              <th
                key={header}
                style={{
                  padding: '12px 16px',
                  textAlign: header === 'Actions' ? 'center' : 'left',
                  color: theme.textSecondary,
                  fontWeight: '500',
                  borderBottom: `1px solid ${theme.border}`
                }}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {recentExpenses.map(expense => (
            <tr key={expense.id} className="expense-row">
              <td style={{
                padding: '12px 16px',
                color: theme.text
              }}>{expense.payer}</td>
              <td style={{
                padding: '12px 16px',
                color: theme.textSecondary
              }}>{format(new Date(expense.date), 'dd.MM.yyyy')}</td>
              <td style={{
                padding: '12px 16px',
                color: theme.text
              }}>{expense.description}</td>
              <td style={{
                padding: '12px 16px',
                color: expense.amount >= 0 ? theme.success : theme.error,
                fontWeight: '600'
              }}>{formatAmount(expense.amount)}</td>
              <td style={{
                padding: '12px 16px',
                color: theme.text,
                maxWidth: '200px'
              }}>
                <div style={{ 
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '4px',
                  alignItems: 'center'
                }}>
                  {expense.participants.map(participant => renderParticipant(participant))}
                </div>
              </td>
              <td style={{
                padding: '12px 16px',
                textAlign: 'center'
              }}>
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  justifyContent: 'center'
                }}>
                  <button
                    onClick={() => onEdit(expense)}
                    style={{
                      backgroundColor: theme.primary,
                      color: '#fff',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <FaPencilAlt size={12} />
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(expense.id)}
                    style={{
                      backgroundColor: theme.error,
                      color: '#fff',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <FaTrash size={12} />
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ExpenseList;
