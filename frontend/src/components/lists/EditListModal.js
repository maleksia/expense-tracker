import React, { useState, useEffect } from 'react';

function EditListModal({ list, onSubmit, onClose, theme }) {
  const [listData, setListData] = useState({
    name: list.name,
    participants: (list.participants || '').split(',')
      .filter(p => p.startsWith('nonRegistered:'))
      .map(p => p.split(':')[1]),
    sharedWith: [],
    existingSharedUsers: new Set(list.registered_participants || [])
  });

  // Update listData with existing participants
  useEffect(() => {
    if (list.registered_participants?.length > 0) {
      setListData(prev => ({
        ...prev,
        sharedWith: [...list.registered_participants]
      }));
    }
  }, [list]);

  const [participantInput, setParticipantInput] = useState('');
  const [userInput, setUserInput] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    setError('');

    if (!listData.name.trim()) {
      setError('Please enter a list name');
      return;
    }

    // Only require participants if there are no shared users
    if (listData.participants.length === 0 && listData.sharedWith.length === 0) {
      setError('Please add at least one participant or share with a registered user');
      return;
    }

    // Filter out existing users from sharedWith before submitting
    const newSharedUsers = listData.sharedWith.filter(
      user => !listData.existingSharedUsers?.has(user)
    );

    onSubmit({
      ...listData,
      sharedWith: newSharedUsers
    });
  };

  const handleAddParticipant = () => {
    if (!participantInput.trim()) return;
    
    // Only check against existing non-registered participants
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
      setError('This participant is already added');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleAddUser = async () => {
    if (!userInput.trim()) return;

    try {
      const response = await fetch(`http://localhost:5000/users/check?username=${userInput}`);
      const data = await response.json();

      if (data.exists) {
        if (!listData.sharedWith.includes(userInput)) {
          setListData(prev => ({
            ...prev,
            sharedWith: [...prev.sharedWith, userInput]
          }));
        }
        setUserInput('');
      } else {
        setError('User not found');
      }
    } catch (error) {
      setError('Failed to verify user');
    }
  };

  const handleCancel = () => {
    // Just close the modal without making any changes
    onClose();
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
        <h3 style={{ color: theme.text, marginBottom: '20px' }}>Edit {list.name}</h3>

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

        {/* Add new Registered Users section */}
        <div className="section">
          <h4 style={{ color: theme.text, marginBottom: '10px' }}>Share with Registered Users</h4>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
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
            marginBottom: '20px'
          }}>
            {listData.sharedWith.map((user, i) => (
              <span
                key={i}
                className="tag registered-user"
                style={{
                  padding: '5px 10px',
                  backgroundColor: theme.primary,
                  color: 'white',
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
                    color: 'white',
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
        
        {error && (
          <div style={{
            color: theme.error,
            marginBottom: '20px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            onClick={handleCancel}
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
            Update
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditListModal;