import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import NewListModal from './NewListModal';
import { fetchLists, createList, updateList, API } from '../../api';
import EditListModal from './EditListModal';
import { FaPencilAlt, FaTrash, FaUsers, FaCalendarAlt, FaExclamationTriangle } from 'react-icons/fa';

function ExpenseListsView({ currentUser, onListSelect }) {
    const { theme } = useTheme();
    const [lists, setLists] = useState([]);
    const [showNewListModal, setShowNewListModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const [editingList, setEditingList] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [listToDelete, setListToDelete] = useState(null);

    useEffect(() => {
        const loadLists = async () => {
            try {
                const userLists = await fetchLists(currentUser);
                setLists(userLists);
            } catch (err) {
                setError('Failed to load expense lists');
            } finally {
                setLoading(false);
            }
        };
        loadLists();
    }, [currentUser]);

    const handleCreateList = async (listData) => {
        try {
            const newList = await createList({
                ...listData,
                createdBy: currentUser
            });
            setLists(prev => [...prev, newList]);
            setShowNewListModal(false);
        } catch (err) {
            setError('Failed to create list');
        }
    };

    const handleSelectList = (listId) => {
        onListSelect(listId);
        navigate(`/list/${listId}`);
    };

    const handleEditList = async (listId, updatedData) => {
        try {
            const updated = await updateList(listId, updatedData);
            setLists(prev => prev.map(list =>
                list.id === listId ? updated : list
            ));
            setEditingList(null);
        } catch (err) {
            setError('Failed to update list');
        }
    };

    const handleDeleteList = async (listId) => {
        try {
            await API.delete(`/lists/${listId}`);
            setLists(prev => prev.filter(list => list.id !== listId));
            setShowDeleteConfirm(false);
            setListToDelete(null);
        } catch (error) {
            setError('Failed to delete list');
        }
    };

    if (loading) return <div className="loading">Loading...</div>;

    return (
        <div style={{ 
            backgroundColor: theme.background,
            color: theme.text,
            padding: '20px',
            minHeight: '100vh'
        }}>
            <div className="lists-header">
                <div className="header-text">
                    <h1 style={{ 
                        color: theme.textHighlight,
                        fontSize: '2.5rem',
                        fontWeight: '700',
                        marginBottom: '10px',
                        textShadow: theme.currentTheme === 'dark' ? '0 2px 4px rgba(0,0,0,0.5)' : 'none'
                    }}>Welcome, {currentUser}!</h1>
                    <h2 style={{ 
                        color: theme.textSecondary,
                        fontSize: '1.2rem',
                        opacity: 0.9,
                        marginBottom: '20px'
                    }}>Manage your shared expenses</h2>
                </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div style={{ 
                display: 'grid',
                gap: '20px',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))'
            }}>
                {lists.map(list => (
                    <div
                        key={list.id}
                        className="list-card"
                        onClick={() => handleSelectList(list.id)}
                        style={{
                            backgroundColor: theme.surface,
                            color: theme.text,
                            padding: '20px',
                            borderRadius: '8px',
                            border: `1px solid ${theme.border}`,
                            transition: 'transform 0.2s',
                            cursor: 'pointer'
                        }}
                    >
                        <div className="list-card-header">
                            <h3 className="list-card-title" style={{ color: theme.text }}>{list.name}</h3>
                            <div className="list-card-actions">
                                <button
                                    className="list-card-btn edit-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingList(list);
                                    }}
                                    aria-label="Edit list"
                                >
                                    <FaPencilAlt />
                                </button>
                                <button
                                    className="list-card-btn delete-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setListToDelete(list);
                                        setShowDeleteConfirm(true);
                                    }}
                                    aria-label="Delete list"
                                >
                                    <FaTrash />
                                </button>
                            </div>
                        </div>
                        <div className="list-card-info">
                            <p>
                                <FaUsers style={{ marginRight: '8px' }} />
                                {list.participants?.map((participant, index) => (
                                    <span key={index} className="participants-tag" style={{
                                        backgroundColor: theme.participantTag,
                                        color: theme.textHighlight,
                                        padding: '4px 8px',
                                        borderRadius: '12px',
                                        margin: '2px',
                                        fontSize: '0.85rem'
                                    }}>
                                        {participant}
                                    </span>
                                ))}
                            </p>
                            <p>
                                <FaCalendarAlt style={{ marginRight: '8px' }} />
                                Created: {new Date(list.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                ))}

                <div 
                    onClick={() => setShowNewListModal(true)}
                    style={{
                        backgroundColor: theme.surface,
                        color: theme.primary,
                        padding: '20px',
                        borderRadius: '8px',
                        border: `2px dashed ${theme.border}`,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '200px'
                    }}
                >
                    <div style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '24px', marginBottom: '10px', display: 'block' }}>+</span>
                        <span>Create New List</span>
                    </div>
                </div>
            </div>

            {editingList && (
                <EditListModal
                    list={editingList}
                    onSubmit={(data) => handleEditList(editingList.id, data)}
                    onClose={() => setEditingList(null)}
                    theme={theme}
                />
            )}

            {showNewListModal && (
                <NewListModal
                    onSubmit={handleCreateList}
                    onClose={() => setShowNewListModal(false)}
                    theme={theme}
                />
            )}

            {showDeleteConfirm && listToDelete && (
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
                    <div style={{
                        backgroundColor: theme.surface,
                        borderRadius: '12px',
                        padding: '24px',
                        maxWidth: '400px',
                        width: '90%',
                        boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
                        border: `1px solid ${theme.border}`
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            marginBottom: '20px',
                            color: theme.error
                        }}>
                            <FaExclamationTriangle size={24} />
                            <h3 style={{ 
                                margin: 0,
                                color: theme.textHighlight,
                                fontSize: '1.5rem'
                            }}>Delete List</h3>
                        </div>

                        <div style={{
                            marginBottom: '24px',
                            color: theme.textSecondary
                        }}>
                            <p style={{ marginBottom: '12px' }}>
                                Are you sure you want to delete "<span style={{ color: theme.text, fontWeight: '500' }}>{listToDelete.name}</span>"?
                            </p>
                            <p style={{
                                backgroundColor: theme.currentTheme === 'dark' ? '#2d2d2d' : '#f8f9fa',
                                padding: '12px',
                                borderRadius: '6px',
                                borderLeft: `4px solid ${theme.error}`,
                                margin: '16px 0'
                            }}>
                                This action cannot be undone. All expenses in this list will be permanently deleted.
                            </p>
                        </div>

                        <div style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '12px'
                        }}>
                            <button
                                onClick={() => {
                                    setShowDeleteConfirm(false);
                                    setListToDelete(null);
                                }}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '6px',
                                    border: `1px solid ${theme.border}`,
                                    backgroundColor: 'transparent',
                                    color: theme.text,
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDeleteList(listToDelete.id)}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    backgroundColor: theme.error,
                                    color: 'white',
                                    cursor: 'pointer'
                                }}
                            >
                                Delete List
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ExpenseListsView;