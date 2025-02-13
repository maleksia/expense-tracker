import React from 'react';
import { FaUserCog } from 'react-icons/fa';
import { useTheme } from '../../context/ThemeContext';

function ParticipantsSelector({ registeredPayers, nonRegisteredPayers, participants, onSelect }) {
  const { theme } = useTheme();

  const toggleParticipant = (type, name) => {
    const participantId = `${type}:${name}`;
    const isSelected = participants.includes(participantId);
    
    const updatedParticipants = isSelected
      ? participants.filter(p => p !== participantId)
      : [...participants, participantId];
    
    onSelect(updatedParticipants);
  };

  const isSelected = (type, name) => {
    return participants.includes(`${type}:${name}`);
  };

  const handleSelectAll = () => {
    const allParticipants = [
      ...registeredPayers.map(p => `registered:${p.name}`),
      ...nonRegisteredPayers.map(name => `nonRegistered:${name}`)
    ];
    onSelect(allParticipants);
  };

  const handleDeselectAll = () => {
    onSelect([]);
  };

  return (
    <div>
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '12px'
      }}>
        <button
          type="button"
          onClick={handleSelectAll}
          style={{
            padding: '4px 8px',
            fontSize: '0.8rem',
            backgroundColor: theme.surface,
            color: theme.text,
            border: `1px solid ${theme.border}`,
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Select All
        </button>
        <button
          type="button"
          onClick={handleDeselectAll}
          style={{
            padding: '4px 8px',
            fontSize: '0.8rem',
            backgroundColor: theme.surface,
            color: theme.text,
            border: `1px solid ${theme.border}`,
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Deselect All
        </button>
      </div>

      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        {registeredPayers?.map(payer => (
          <button
            type="button"
            key={`reg-${payer.username}`}
            onClick={() => toggleParticipant('registered', payer.name)}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '8px 12px',
              borderRadius: '20px',
              border: 'none',
              backgroundColor: isSelected('registered', payer.name) ? theme.primary : theme.surface,
              color: isSelected('registered', payer.name) ? 'white' : theme.text,
              cursor: 'pointer'
            }}
          >
            <FaUserCog style={{ marginRight: '6px' }} />
            {payer.name}
          </button>
        ))}
        
        {nonRegisteredPayers?.map(name => (
          <button
            type="button"
            key={`nonreg-${name}`}
            onClick={() => toggleParticipant('nonRegistered', name)}
            style={{
              padding: '8px 12px',
              borderRadius: '20px',
              border: 'none',
              backgroundColor: isSelected('nonRegistered', name) ? theme.primary : theme.surface,
              color: isSelected('nonRegistered', name) ? 'white' : theme.text,
              cursor: 'pointer'
            }}
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}

export default ParticipantsSelector;