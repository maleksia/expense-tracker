import React, { useState } from 'react';

function NewListModal({ onSubmit, onClose, theme }) {
  const [listData, setListData] = useState({
    name: '',
    participants: []
  });
  const [participantInput, setParticipantInput] = useState('');
  const [error, setError] = useState('');

  const handleAddParticipant = () => {
    if (participantInput && !listData.participants.includes(participantInput)) {
      setListData(prev => ({
        ...prev,
        participants: [...prev.participants, participantInput]
      }));
      setParticipantInput('');
    }
  };

  const handleSubmit = () => {
    setError('');
    if (!listData.name.trim()) {
      setError('Please enter a list name');
      return;
    }
    if (listData.participants.length === 0) {
      setError('Please add at least one participant');
      return;
    }
    onSubmit(listData);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <div style={{
        backgroundColor: theme.surface,
        padding: '30px',
        borderRadius: '8px',
        width: '90%',
        maxWidth: '500px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ color: theme.text, marginBottom: '20px' }}>Create New Expense List</h3>

        <input
          type="text"
          placeholder="List Name"
          value={listData.name}
          onChange={(e) => setListData({ ...listData, name: e.target.value })}
          style={{
            width: '100%',
            padding: '10px',
            marginBottom: '20px',
            borderRadius: '4px',
            border: `1px solid ${theme.border}`,
            backgroundColor: theme.background,
            color: theme.text
          }}
        />

        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              placeholder="Add participant"
              value={participantInput}
              onChange={(e) => setParticipantInput(e.target.value)}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '4px',
                border: `1px solid ${theme.border}`,
                backgroundColor: theme.background,
                color: theme.text
              }}
            />
            <button
              onClick={handleAddParticipant}
              style={{
                padding: '10px 20px',
                backgroundColor: theme.primary,
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Add
            </button>
          </div>
        </div>

        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          marginBottom: '20px'
        }}>
          {listData.participants.map((p, i) => (
            <span
              key={i}
              style={{
                padding: '5px 10px',
                backgroundColor: theme.background,
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              {p}
              <button
                onClick={() => setListData(prev => ({
                  ...prev,
                  participants: prev.participants.filter((_, index) => index !== i)
                }))}
                style={{
                  background: 'none',
                  border: 'none',
                  color: theme.error,
                  cursor: 'pointer',
                  padding: '0 5px'
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        {error && (
          <p style={{
            color: theme.error,
            margin: '10px 0'
          }}>
            {error}
          </p>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: theme.surface,
              color: theme.text,
              border: `1px solid ${theme.border}`,
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            style={{
              padding: '10px 20px',
              backgroundColor: theme.primary,
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Create List
          </button>
        </div>
      </div>
    </div>
  );
}

export default NewListModal;