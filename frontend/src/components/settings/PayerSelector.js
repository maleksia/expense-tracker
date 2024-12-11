import React from 'react';
import { useTheme } from '../../context/ThemeContext';

function PayerSelector({ payers, selectedPayer, onSelect }) {
  const { theme } = useTheme();

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px'
    }}>
      {payers.map(payer => (
        <button
          key={payer.id}
          type="button"
          onClick={() => onSelect(payer.name)}
          style={{
            padding: '8px 16px',
            backgroundColor: selectedPayer === payer.name ? theme.primary : theme.surface,
            color: selectedPayer === payer.name ? '#fff' : theme.text,
            border: `1px solid ${theme.border}`,
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {payer.name}
        </button>
      ))}
    </div>
  );
}

export default PayerSelector;