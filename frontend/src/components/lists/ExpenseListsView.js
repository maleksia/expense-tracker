import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import NewListModal from './NewListModal';
import { fetchLists, createList, updateList, API } from '../../api';
import EditListModal from './EditListModal';

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

    if (loading) return <div>Loading...</div>;

    return (
        <div style={{
            padding: '20px',
            maxWidth: '1200px',
            margin: '0 auto'
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px'
            }}>
                <div>
                    <h1 style={{ 
                        color: theme.text,
                        marginBottom: '8px' 
                    }}>
                        Hello {currentUser}!
                    </h1>
                    <h2 style={{ 
                        color: theme.text,
                        opacity: 0.8,
                        fontWeight: 'normal'
                    }}>
                        Your Expense Lists
                    </h2>
                </div>
                <button
                    onClick={() => setShowNewListModal(true)}
                    style={{
                        backgroundColor: theme.primary,
                        color: '#fff',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Create New List
                </button>
            </div>

            {error && (
                <p style={{ color: theme.error, marginBottom: '20px' }}>{error}</p>
            )}

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '20px'
            }}>
                {lists.map(list => (
                    <div
                        key={list.id}
                        onClick={() => handleSelectList(list.id)}
                        style={{
                            backgroundColor: theme.surface,
                            padding: '20px',
                            borderRadius: '8px',
                            cursor: 'pointer'
                        }}
                    >
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '10px'
                        }}>
                            <h3 style={{ color: theme.text, margin: 0 }}>{list.name}</h3>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingList(list);
                                    }}
                                    style={{
                                        backgroundColor: theme.primary,
                                        color: '#fff',
                                        border: 'none',
                                        padding: '5px 10px',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setListToDelete(list);
                                        setShowDeleteConfirm(true);
                                    }}
                                    style={{
                                        backgroundColor: theme.error,
                                        color: '#fff',
                                        border: 'none',
                                        padding: '5px 10px',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Delete
                                </button>

                            </div>
                        </div>
                        <p style={{ color: theme.text, opacity: 0.7 }}>
                            {list.participants?.length || 0}
                            {list.participants?.length === 1 ? ' participant:' : ' participants:'}
                            <br />
                            {list.participants?.map((participant, index) => (
                                <span key={index}>
                                    {participant}
                                    {index < list.participants.length - 1 ? ', ' : ''}
                                </span>
                            ))}
                        </p>
                        <p style={{ color: theme.text, opacity: 0.7 }}>
                            Created: {new Date(list.createdAt).toLocaleDateString()}
                        </p>
                    </div>
                ))}
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
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <div style={{
                        backgroundColor: theme.surface,
                        padding: '24px',
                        borderRadius: '8px',
                        maxWidth: '400px',
                        width: '90%'
                    }}>
                        <h3 style={{ color: theme.text }}>Delete List</h3>
                        <p style={{ color: theme.text }}>
                            Are you sure you want to delete "{listToDelete.name}"?
                        </p>
                        <p style={{ color: theme.text }}>
                            This will also delete all expenses in this list.
                        </p>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '12px',
                            marginTop: '24px'
                        }}>
                            <button
                                onClick={() => {
                                    setShowDeleteConfirm(false);
                                    setListToDelete(null);
                                }}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '4px',
                                    border: `1px solid ${theme.border}`,
                                    backgroundColor: theme.surface,
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
                                    borderRadius: '4px',
                                    border: 'none',
                                    backgroundColor: theme.error,
                                    color: '#fff',
                                    cursor: 'pointer'
                                }}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ExpenseListsView;