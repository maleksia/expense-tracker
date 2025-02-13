import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import NewListModal from './NewListModal';
import { fetchLists, createList, updateList, API } from '../../api';
import EditListModal from './EditListModal';
import { FaPencilAlt, FaTrash, FaUsers, FaCalendarAlt, FaExclamationTriangle, FaShare, FaUserCog } from 'react-icons/fa';
import ShareListModal from './ShareListModal';

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
    const [shareList, setShareList] = useState(null);
    const [notification, setNotification] = useState(null);
    const [shareRequests, setShareRequests] = useState([]);
    const [deletionRequests, setDeletionRequests] = useState(new Set());

    const showNotification = (message, type) => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

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

    useEffect(() => {
        const fetchShareRequests = async () => {
            try {
                const response = await fetch(`http://localhost:5000/share-requests?username=${currentUser}`);
                if (response.ok) {
                    const data = await response.json();
                    setShareRequests(data);
                }
            } catch (error) {
                console.error('Failed to fetch share requests:', error);
            }
        };

        fetchShareRequests();
        const interval = setInterval(fetchShareRequests, 30000); // Check every 30 seconds
        return () => clearInterval(interval);
    }, [currentUser]);

    const handleCreateList = async (listData) => {
        try {
            const newList = await createList({
                ...listData,
                createdBy: currentUser,
                participants: [
                    ...listData.participants,
                    ...(listData.includeCreator ? [currentUser] : [])
                ].filter((p, i, arr) => arr.indexOf(p) === i)  // Remove duplicates
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
            // First update the list details
            const updated = await updateList(listId, updatedData);
            
            // Only create share requests for new users
            if (updatedData.sharedWith?.length > 0) {
                for (const username of updatedData.sharedWith) {
                    await fetch(`http://localhost:5000/lists/${listId}/share`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ 
                            username,
                            from_username: currentUser,
                            message: `Added you while editing the list "${updatedData.name}"`
                        })
                    });
                }
                showNotification('List updated and share requests sent to new users', 'success');
            } else {
                showNotification('List updated successfully', 'success');
            }
            
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
            const response = await API.delete(`/lists/${listId}?username=${currentUser}`);
            if (response.status === 202) {
                // List requires approvals
                showNotification('Deletion request sent to other participants', 'info');
            } else {
                setLists(prev => prev.filter(list => list.id !== listId));
                showNotification('List deleted successfully', 'success');
            }
            setShowDeleteConfirm(false);
            setListToDelete(null);
        } catch (error) {
            setError('Failed to delete list');
        }
    };

    useEffect(() => {
        const checkDeletionRequests = async () => {
            const newDeletionRequests = new Set();
            for (const list of lists) {
                try {
                    const response = await fetch(`http://localhost:5000/lists/${list.id}/deletion-requests`);
                    if (response.ok) {
                        const requests = await response.json();
                        if (requests.length > 0) {
                            // Only add to deletionRequests if there's a pending request
                            const pendingRequests = requests.filter(req => req.status === 'pending');
                            if (pendingRequests.length > 0) {
                                newDeletionRequests.add(list.id);
                                // Only add to shareRequests if it's for another user and pending
                                pendingRequests.forEach(request => {
                                    if (request.requested_by !== currentUser) {
                                        setShareRequests(prev => {
                                            if (!prev.some(r => r.id === request.id)) {
                                                return [...prev, {
                                                    ...request,
                                                    type: 'deletion',
                                                    list_name: list.name
                                                }];
                                            }
                                            return prev;
                                        });
                                    }
                                });
                            }
                        }
                    }
                } catch (error) {
                    console.error('Failed to check deletion requests:', error);
                }
            }
            setDeletionRequests(newDeletionRequests);
        };

        checkDeletionRequests();
        const interval = setInterval(checkDeletionRequests, 30000); // Check every 30 seconds
        return () => clearInterval(interval);
    }, [lists, currentUser]);

    const handleShare = async (username, message) => {
        try {
            const response = await fetch(`http://localhost:5000/lists/${shareList.id}/share`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    username,
                    from_username: currentUser,
                    message
                })
            });
            
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to share list');
            }
            
            setShareList(null);
            showNotification('List share request sent successfully', 'success');
        } catch (error) {
            setError(error.message);
        }
    };

    const handleShareResponse = async (request, accept) => {
        try {
            if (request.type === 'deletion') {
                const response = await fetch(`http://localhost:5000/deletion-requests/${request.id}/approve`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username: currentUser, approved: accept })
                });

                if (response.ok) {
                    setShareRequests(prev => prev.filter(req => req.id !== request.id));
                    showNotification(accept ? 'List deletion approved' : 'List deletion rejected', 'success');
                }
            } else {
                // Handle share request
                const response = await fetch(`http://localhost:5000/share-requests/${request.id}/respond`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ accept })
                });

                if (response.ok) {
                    setShareRequests(prev => prev.filter(req => req.id !== request.id));
                    if (accept) {
                        const updatedLists = await fetchLists(currentUser);
                        setLists(updatedLists);
                        showNotification('List share accepted', 'success');
                    } else {
                        showNotification('List share rejected', 'info');
                    }
                }
            }
        } catch (error) {
            setError('Failed to respond to request');
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
            {notification && (
                <div style={{
                    position: 'fixed',
                    top: '20px',
                    right: '20px',
                    padding: '12px 24px',
                    borderRadius: '4px',
                    backgroundColor: notification.type === 'success' ? theme.success : theme.error,
                    color: 'white',
                    zIndex: 1000,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}>
                    {notification.message}
                </div>
            )}

            {shareRequests.length > 0 && (
                <div className="share-requests-container">
                    <h3>Pending Share Requests</h3>
                    {shareRequests.map(request => (
                        <div key={request.id} className="share-request">
                            <div>
                                {/* For share requests */}
                                {!request.type && (
                                    <span>{request.from_user} wants to share "{request.list_name}"-list with you</span>
                                )}
                                {/* For deletion requests */}
                                {request.type === 'deletion' && (
                                    <span>{request.requested_by} wants to delete "{request.list_name}"</span>
                                )}
                                {request.message && (
                                    <p className="share-request-message">
                                        "{request.message}"
                                    </p>
                                )}
                            </div>
                            <div className="share-request-actions">
                                <button
                                    onClick={() => handleShareResponse(request, true)}
                                    className="accept-btn"
                                >
                                    Accept
                                </button>
                                <button
                                    onClick={() => handleShareResponse(request, false)}
                                    className="reject-btn"
                                >
                                    Reject
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

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
                            cursor: 'pointer',
                            position: 'relative'
                        }}
                    >
                        {deletionRequests.has(list.id) && (
                            <div style={{
                                position: 'absolute',
                                top: '10px',
                                right: '10px',
                                backgroundColor: theme.error,
                                color: 'white',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '0.8rem'
                            }}>
                                Deletion Pending
                            </div>
                        )}
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
                                    className="list-card-btn share-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShareList(list);
                                    }}
                                    aria-label="Share list"
                                >
                                    <FaShare />
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
                                {/* Render registered participants */}
                                {list.registered_participants?.map((participant, index) => (
                                    <span key={`reg-${index}`} className="participants-tag registered" style={{
                                        backgroundColor: theme.primary,
                                        color: 'white',
                                        padding: '4px 8px',
                                        borderRadius: '12px',
                                        margin: '2px',
                                        fontSize: '0.85rem',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}>
                                        <FaUserCog size={12} />
                                        {participant}
                                    </span>
                                ))}
                                {/* Render non-registered participants */}
                                {list.non_registered_participants?.map((participant, index) => (
                                    <span key={`nonreg-${index}`} className="participants-tag" style={{
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
                            <p style={{
                                color: theme.textSecondary,
                                fontSize: '0.9rem',
                                marginTop: '8px',
                                display: 'flex',
                                alignItems: 'center'
                            }}>
                                <FaUserCog style={{ marginRight: '8px' }} />
                                Created by: <span style={{ 
                                    color: theme.textHighlight,
                                    marginLeft: '4px',
                                    fontWeight: list.created_by === currentUser ? '600' : '400'
                                }}>
                                    {list.created_by}
                                </span>
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

            {shareList && (
                <ShareListModal
                    list={shareList}
                    onShare={handleShare}
                    onClose={() => setShareList(null)}
                    theme={theme}
                />
            )}
        </div>
    );
}

export default ExpenseListsView;