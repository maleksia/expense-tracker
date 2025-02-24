import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useCurrency } from '../../context/CurrencyContext';

function ListSettings({ currentUser, currentList }) {
  const { currentTheme, setCurrentTheme, theme } = useTheme();
  const { listCurrencies, setCurrencyForList } = useCurrency();

  const currencies = [
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'GBP', symbol: '£', name: 'British Pound' }
  ];

  const handleCurrencyChange = (e) => {
    setCurrencyForList(currentList.id, e.target.value);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ color: theme.text, marginBottom: '30px' }}>List Settings</h2>

      <div style={{ backgroundColor: theme.surface, padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3 style={{ color: theme.text, marginBottom: '15px' }}>Theme</h3>
        <select
          value={currentTheme}
          onChange={(e) => setCurrentTheme(e.target.value)}
          style={{
            padding: '8px',
            borderRadius: '4px',
            border: `1px solid ${theme.border}`,
            backgroundColor: theme.background,
            color: theme.text
          }}
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="forest">Forest</option>
        </select>
      </div>

      <div style={{
        backgroundColor: theme.surface,
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h3 style={{ color: theme.text, marginBottom: '15px' }}>Currency</h3>
        <select
          value={listCurrencies[currentList.id] || 'EUR'}
          onChange={handleCurrencyChange}
          style={{
            padding: '8px',
            borderRadius: '4px',
            border: `1px solid ${theme.border}`,
            backgroundColor: theme.background,
            color: theme.text
          }}
        >
          {currencies.map(curr => (
            <option key={curr.code} value={curr.code}>
              {curr.name} ({curr.symbol})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default ListSettings;