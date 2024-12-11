import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';

function ParticipantsSelector({ payers, selectedParticipants, onSelect }) {
  const { theme } = useTheme();
  const [showSelector, setShowSelector] = useState(false);

  const selectAll = () => {
    onSelect(payers.map(p => p.name));
    setShowSelector(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
        <button
          type="button"
          onClick={selectAll}
          style={{
            backgroundColor: !showSelector ? theme.primary : theme.surface,
            color: !showSelector ? '#fff' : theme.text,
            border: `1px solid ${theme.border}`,
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => setShowSelector(true)}
          style={{
            backgroundColor: showSelector ? theme.primary : theme.surface,
            color: showSelector ? '#fff' : theme.text,
            border: `1px solid ${theme.border}`,
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Select Participants
        </button>
      </div>

      {showSelector && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          {payers.map(payer => (
            <button
              key={payer.id}
              type="button"
              onClick={() => {
                const isSelected = selectedParticipants.includes(payer.name);
                const newParticipants = isSelected
                  ? selectedParticipants.filter(p => p !== payer.name)
                  : [...selectedParticipants, payer.name];
                onSelect(newParticipants);
              }}
              style={{
                backgroundColor: selectedParticipants.includes(payer.name) ? theme.primary : theme.surface,
                color: selectedParticipants.includes(payer.name) ? '#fff' : theme.text,
                border: `1px solid ${theme.border}`,
                padding: '8px 16px',
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

export default ParticipantsSelector;