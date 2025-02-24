import React, { useState } from 'react';

function NewListModal({ onSubmit, onClose, theme }) {
  const [listData, setListData] = useState({
    name: '',
    participants: [],
    sharedWith: [],
    includeCreator: true
  });
  const [participantInput, setParticipantInput] = useState('');
  const [userInput, setUserInput] = useState('');
  const [error, setError] = useState('');

  const handleAddParticipant = () => {
    if (!participantInput.trim()) return;

    // Remove the duplicate name check against sharedWith
    // Just check if the name exists in non-registered participants
    const isDuplicateNonRegistered = listData.participants.includes(participantInput);
    
    if (!isDuplicateNonRegistered) {
      setListData(prev => ({
        ...prev,
        participants: [...prev.participants, participantInput]
      }));
      setParticipantInput('');
      
      // Just show info message if a registered user with same name exists
      if (listData.sharedWith.includes(participantInput)) {
        setError('Note: A registered user with this name exists');
        setTimeout(() => setError(''), 3000);
      }
    } else {
      setError('This participant already exists');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleAddUser = async () => {
    if (!userInput.trim()) return;

    try {
      // Check if user exists
      const response = await fetch(`http://localhost:5000/users/check?username=${userInput}`);
      const data = await response.json();

      if (data.exists) {
        if (!listData.sharedWith.includes(userInput)) {
          setListData(prev => ({
            ...prev,
            sharedWith: [...prev.sharedWith, userInput]
          }));
        }
      } else {
        setError('User not found');
      }
    } catch (error) {
      setError('Failed to verify user');
    }
    setUserInput('');
  };

  const handleSubmit = () => {
    setError('');
    if (!listData.name.trim()) {
      setError('Please enter a list name');
      return;
    }
    if (listData.participants.length === 0 && !listData.includeCreator) {
      setError('Please add at least one participant or include yourself');
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
          maxLength={25}
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
              maxLength={20}
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

        {/* Registered users section */}
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ color: theme.text }}>Share with Registered Users</h4>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              placeholder="Enter username"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
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
              onClick={handleAddUser}
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
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px',
            marginTop: '10px'
          }}>
            {listData.sharedWith.map((user, i) => (
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
                {user}
                <button
                  onClick={() => setListData(prev => ({
                    ...prev,
                    sharedWith: prev.sharedWith.filter((_, index) => index !== i)
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
        </div>

        {/* Add checkbox for creator inclusion */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: theme.text,
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={listData.includeCreator}
              onChange={(e) => setListData(prev => ({
                ...prev,
                includeCreator: e.target.checked
              }))}
            />
            Include me as a participant
          </label>
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