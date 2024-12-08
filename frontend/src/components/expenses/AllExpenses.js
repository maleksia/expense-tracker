import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';

function AllExpenses({ currentUser, expenses, handleDeleteExpense }) {
  const [selectedPayer, setSelectedPayer] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const { theme } = useTheme();
  const [sortConfig, setSortConfig] = useState({
    key: 'date',
    direction: 'desc'
  });

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

  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) return '⇅';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const filteredExpenses = sortedExpenses.filter((expense) => {
    return (
      (!selectedPayer || expense.payer === selectedPayer) &&
      (!selectedCategory || expense.category === selectedCategory)
    );
  });

  return (
    <div className="all-expenses" style={{ color: theme.text }}>
      <h2>All Expenses</h2>

      <div className="filters">
        <select
          value={selectedPayer}
          onChange={(e) => setSelectedPayer(e.target.value)}
          style={{
            backgroundColor: theme.surface,
            color: theme.text,
            border: `1px solid ${theme.border}`
          }}
        >
          <option value="">All Payers</option>
          {[...new Set(expenses.map(e => e.payer))].map(payer => (
            <option key={payer} value={payer}>{payer}</option>
          ))}
        </select>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={{
            backgroundColor: theme.surface,
            color: theme.text,
            border: `1px solid ${theme.border}`
          }}
        >
          <option value="">All Categories</option>
          {[...new Set(expenses.map(e => e.category))].map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
      </div>

      <table className="expenses-table" style={{
        backgroundColor: theme.surface,
        color: theme.text,
        border: `1px solid ${theme.border}`
      }}>
        <thead>
          <tr>
            {[
              'date',
              'payer',
              'amount',
              'description',
              'category',
              'participants'
            ].map((key) => (
              <th
                key={key}
                style={{ backgroundColor: theme.background }}
                onClick={() => handleSort(key)}
                className="sortable"
              >
                {key.charAt(0).toUpperCase() + key.slice(1)} {getSortIcon(key)}
              </th>
            ))}
            <th style={{ backgroundColor: theme.background }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredExpenses.map((expense) => (
            <tr key={expense.id} style={{
              borderBottom: `1px solid ${theme.border}`
            }}>
              <td>{new Date(expense.date).toLocaleDateString()}</td>
              <td>{expense.payer}</td>
              <td>{expense.amount.toFixed(2)} €</td>
              <td>{expense.description}</td>
              <td>{expense.category}</td>
              <td>
                <div className="participants-list">
                  {expense.participants?.join(', ') || expense.payer}
                </div>
              </td>
              <td>
                <button
                  onClick={() => handleDeleteExpense(expense.id)}
                  className="delete-btn"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AllExpenses;