import React, { useState } from 'react';
import { FaShare } from 'react-icons/fa';

function ShareListModal({ list, onShare, onClose, theme }) {
    const [username, setUsername] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!username.trim()) {
            setError('Please enter a username');
            return;
        }
        onShare(username.trim(), message);
    };

    return (
        <div className="modal-overlay" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }}>
            <div className="share-modal" style={{
                backgroundColor: theme.surface,
                borderRadius: '12px',
                padding: '24px',
                width: '90%',
                maxWidth: '500px',
                boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
                border: `1px solid ${theme.border}`
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '24px',
                    borderBottom: `1px solid ${theme.border}`,
                    paddingBottom: '16px'
                }}>
                    <FaShare size={24} color={theme.primary} />
                    <h3 style={{ 
                        margin: 0,
                        color: theme.textHighlight,
                        fontSize: '1.5rem'
                    }}>Share List</h3>
                </div>

                <form onSubmit={handleSubmit} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px'
                }}>
                    <div>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            color: theme.textSecondary,
                            fontSize: '0.9rem'
                        }}>
                            Share "{list.name}" with:
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter username"
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '6px',
                                border: `1px solid ${theme.border}`,
                                backgroundColor: theme.background,
                                color: theme.text,
                                fontSize: '1rem'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            color: theme.textSecondary,
                            fontSize: '0.9rem'
                        }}>
                            Add a message (optional):
                        </label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Write a message to the recipient..."
                            rows={4}
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '6px',
                                border: `1px solid ${theme.border}`,
                                backgroundColor: theme.background,
                                color: theme.text,
                                fontSize: '1rem',
                                resize: 'vertical',
                                minHeight: '100px'
                            }}
                        />
                    </div>

                    {error && (
                        <div style={{
                            color: theme.error,
                            fontSize: '0.9rem',
                            padding: '8px 12px',
                            backgroundColor: `${theme.error}15`,
                            borderRadius: '4px'
                        }}>
                            {error}
                        </div>
                    )}

                    <div style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '12px',
                        marginTop: '12px'
                    }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                padding: '12px 24px',
                                borderRadius: '6px',
                                border: `1px solid ${theme.border}`,
                                backgroundColor: 'transparent',
                                color: theme.text,
                                cursor: 'pointer',
                                fontSize: '0.95rem'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            style={{
                                padding: '12px 24px',
                                borderRadius: '6px',
                                border: 'none',
                                backgroundColor: theme.primary,
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '0.95rem',
                                fontWeight: '500'
                            }}
                        >
                            Share List
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default ShareListModal;
