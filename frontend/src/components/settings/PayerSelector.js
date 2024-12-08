import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';

function PayerSelector({ payers, selectedPayer, onSelect }) {
  const { theme } = useTheme();
  const [useManualInput, setUseManualInput] = useState(false);
  const [manualPayer, setManualPayer] = useState('');

  const handleManualSubmit = (e) => {
    e.preventDefault();
    onSelect(manualPayer);
  };

  return (
    <div className="payer-selector" style={{ marginBottom: '1rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <button
          type="button"
          onClick={() => setUseManualInput(false)}
          style={{
            backgroundColor: !useManualInput ? theme.primary : theme.surface,
            color: !useManualInput ? '#fff' : theme.text,
            border: `1px solid ${theme.border}`,
            borderRadius: '4px 0 0 4px',
            padding: '0.5rem 1rem',
            cursor: 'pointer'
          }}
        >
          Registered Payers
        </button>
        <button
          type="button"
          onClick={() => setUseManualInput(true)}
          style={{
            backgroundColor: useManualInput ? theme.primary : theme.surface,
            color: useManualInput ? '#fff' : theme.text,
            border: `1px solid ${theme.border}`,
            borderRadius: '0 4px 4px 0',
            padding: '0.5rem 1rem',
            cursor: 'pointer'
          }}
        >
          Manual Input
        </button>
      </div>

      {useManualInput ? (
        <input
          type="text"
          value={manualPayer}
          onChange={(e) => setManualPayer(e.target.value)}
          onBlur={handleManualSubmit}
          placeholder="Enter payer name"
          style={{
            padding: '0.5rem',
            borderRadius: '4px',
            border: `1px solid ${theme.border}`,
            backgroundColor: theme.surface,
            color: theme.text
          }}
        />
      ) : (
        <div>
          {payers.map(payer => (
            <button
              key={payer.id}
              type="button"
              onClick={() => onSelect(payer.name)}
              style={{
                padding: '0.5rem 1rem',
                margin: '0 0.5rem',
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
      )}
    </div>
  );
}

export default PayerSelector;