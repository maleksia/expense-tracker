import React, { useState } from 'react';
import { FaFilter, FaSort, FaUserCog, FaPencilAlt, FaTrash } from 'react-icons/fa';
import { useTheme } from '../../context/ThemeContext';
import { useCurrency } from '../../context/CurrencyContext';
import AddExpenseForm from './AddExpenseForm';
import { updateExpense, fetchExpenses } from '../../api';

function AllExpenses({ currentUser, expenses, handleDeleteExpense, setExpenses, currentList }) {
  const { theme } = useTheme();
  const { listCurrencies } = useCurrency();
  const [selectedPayer, setSelectedPayer] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortConfig, setSortConfig] = useState({
    key: 'date',
    direction: 'desc'
  });
  const [editingExpense, setEditingExpense] = useState(null);

  const currencySymbols = {
    'EUR': '€',
    'USD': '$',
    'GBP': '£'
  };

  const currentCurrency = listCurrencies[currentList?.id] || 'EUR';

  // Sorting function
  const sortedExpenses = [...expenses].sort((a, b) => {
    if (sortConfig.key === 'date') {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
    }
    if (sortConfig.key === 'amount') {
      return sortConfig.direction === 'asc' ?
        a.amount - b.amount :
        b.amount - a.amount;
    }
    // String comparison for other fields
    if (a[sortConfig.key] < b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (a[sortConfig.key] > b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const handleSort = (key) => {
    setSortConfig({
      key,
      direction:
        sortConfig.key === key && sortConfig.direction === 'asc'
          ? 'desc'
          : 'asc',
    });
  };

  const filteredExpenses = sortedExpenses.filter((expense) => {
    return (
      (!selectedPayer || expense.payer === selectedPayer) &&
      (!selectedCategory || expense.category === selectedCategory)
    );
  });

  const formatParticipant = (participant) => {
    // Skip if participant is empty or undefined
    if (!participant) return null;
    
    // Split into status and name parts
    const [status, name] = participant.split(':');
    const isRegistered = status === 'registered';
    
    return (
      <span
        key={participant}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          backgroundColor: isRegistered ? `${theme.primary}15` : theme.surface,
          padding: '4px 8px',
          borderRadius: '12px',
          margin: '2px',
          fontSize: '0.85rem'
        }}
      >
        {isRegistered && <FaUserCog size={12} color={theme.primary} />}
        {name}
      </span>
    );
  };

  const renderPayer = (payer) => {
    // Parse the payer string which should be in format "status:name"
    const [status, name] = payer.split(':');
    const isRegistered = status === 'registered';
    
    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        backgroundColor: isRegistered ? `${theme.primary}15` : theme.surface,
        padding: '6px 12px',
        borderRadius: '20px',
        fontSize: '0.95rem'
      }}>
        {isRegistered && <FaUserCog size={12} color={theme.primary} />}
        <span style={{ color: theme.text }}>{name}</span>
      </div>
    );
  };

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
    } catch (error) {
      console.error('Failed to update expense:', error);
    }
  };

  if (editingExpense) {
    return (
      <AddExpenseForm
        onSubmit={handleEditComplete}
        currentUser={currentUser}
        currentList={currentList}
        initialData={editingExpense}
        onCancel={() => setEditingExpense(null)}
      />
    );
  }

  return (
    <div className="card-container" style={{
      backgroundColor: 'var(--color-surface)',
      color: 'var(--color-text)',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.2)',
      border: '1px solid var(--color-border)'
    }}>
      <div className="section-header" style={{
        borderBottom: `1px solid ${theme.border}`,
        paddingBottom: '16px',
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h2 style={{
          color: theme.textHighlight,
          fontSize: '2rem',
          fontWeight: '600',
          margin: 0
        }}>All Expenses</h2>

        <div style={{ display: 'flex', gap: '12px' }}>
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
              {[...new Set(expenses.map(e => e.payer))].map(payer => (
                <option key={payer} value={payer}>{payer}</option>
              ))}
            </select>
          </div>

          <div style={{ 
            display: 'flex',
            gap: '8px',
            backgroundColor: theme.background,
            padding: '8px',
            borderRadius: '6px'
          }}>
            <FaFilter style={{ color: theme.textSecondary }} />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{
                backgroundColor: 'transparent',
                color: theme.text,
                border: 'none',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="">All Categories</option>
              {[...new Set(expenses.map(e => e.category))].map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <table className="expenses-table" style={{
        width: '100%',
        borderCollapse: 'separate',
        borderSpacing: '0',
        marginTop: '16px'
      }}>
        <thead>
          <tr>
            {[
              ['date', 'Date'],
              ['payer', 'Payer'],
              ['amount', 'Amount'],
              ['description', 'Description'],
              ['category', 'Category'],
              ['participants', 'Participants']
            ].map(([key, label]) => (
              <th
                key={key}
                onClick={() => handleSort(key)}
                style={{
                  backgroundColor: theme.background,
                  color: theme.textHighlight,
                  padding: '12px 16px',
                  fontWeight: '600',
                  textAlign: 'left',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {label}
                  <FaSort style={{ 
                    color: sortConfig.key === key ? theme.primary : theme.textSecondary,
                    fontSize: '14px'
                  }} />
                </div>
              </th>
            ))}
            <th style={{ backgroundColor: theme.background, padding: '12px 16px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredExpenses.map((expense) => (
            <tr key={expense.id} style={{
              borderBottom: `1px solid ${theme.border}`
            }}>
              <td>{new Date(expense.date).toLocaleDateString()}</td>
              <td>{renderPayer(expense.payer)}</td>
              <td>{expense.amount.toFixed(2)} {currencySymbols[currentCurrency]}</td>
              <td>{expense.description}</td>
              <td>{expense.category}</td>
              <td>
                <div style={{ 
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '4px'
                }}>
                  {expense.participants?.map(formatParticipant)}
                </div>
              </td>
              <td>
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  justifyContent: 'flex-start'
                }}>
                  <button
                    onClick={() => handleEditExpense(expense)}
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
                    onClick={() => handleDeleteExpense(expense.id)}
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

export default AllExpenses;