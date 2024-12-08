import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { fetchPayers, addPayer, deletePayer, fetchCategories, addCategory, deleteCategory } from '../../api';


function Settings({ currentUser }) {
    const { currentTheme, setCurrentTheme, theme } = useTheme();
    const [newPayer, setNewPayer] = useState('');
    const [newCategory, setNewCategory] = useState('');
    const [payers, setPayers] = useState([]);
    const [categories, setCategories] = useState([]);


    useEffect(() => {
        const loadData = async () => {
            try {
                const [payersList, categoriesList] = await Promise.all([
                    fetchPayers(currentUser),
                    fetchCategories(currentUser)
                ]);
                setPayers(payersList);
                setCategories(categoriesList);
            } catch (error) {
                console.error('Error loading data:', error);
            }
        };
        loadData();
    }, [currentUser]);


    const handleAddPayer = async (e) => {
        e.preventDefault();
        try {
            const added = await addPayer({ name: newPayer, username: currentUser });
            setPayers([...payers, added]);
            setNewPayer('');
        } catch (error) {
            console.error('Error adding payer:', error);
        }
    };

    const handleAddCategory = async (e) => {
        e.preventDefault();
        try {
            const added = await addCategory({
                name: newCategory,
                username: currentUser
            });
            setCategories([...categories, added]);
            setNewCategory('');
        } catch (error) {
            console.error('Error adding category:', error);
        }
    };

    const handleDeletePayer = async (id) => {
        try {
            await deletePayer(id);
            setPayers(payers.filter(payer => payer.id !== id));
        } catch (error) {
            console.error('Error deleting payer:', error);
        }
    };

    const handleDeleteCategory = async (id) => {
        try {
            await deleteCategory(id);
            setCategories(categories.filter(category => category.id !== id));
        } catch (error) {
            console.error('Error deleting category:', error);
        }
    };


    return (
        <div className="settings" style={{
            background: theme.background,
            color: theme.text
        }}>
            <h2>Settings</h2>
            <div className="settings-section">
                <h3>Theme</h3>
                <select
                    value={currentTheme}
                    onChange={(e) => setCurrentTheme(e.target.value)}
                    style={{
                        background: theme.surface,
                        color: theme.text,
                        border: `1px solid ${theme.border}`
                    }}
                >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="forest">Forest</option>
                </select>
                <h3>Manage Payers</h3>
                <form onSubmit={handleAddPayer}>
                    <input
                        type="text"
                        value={newPayer}
                        onChange={(e) => setNewPayer(e.target.value)}
                        placeholder="Add new payer"
                        style={{
                            backgroundColor: theme.surface,
                            color: theme.text,
                            border: `1px solid ${theme.border}`
                        }}
                    />
                    <button type="submit">Add Payer</button>
                </form>
                <div className="items-list">
                    {payers.map(payer => (
                        <div key={payer.id} className="list-item" style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '0.5rem',
                            margin: '0.5rem 0',
                            backgroundColor: theme.surface,
                            borderRadius: '4px'
                        }}>
                            <span>{payer.name}</span>
                            <button
                                onClick={() => handleDeletePayer(payer.id)}
                                style={{
                                    backgroundColor: theme.error,
                                    color: '#fff',
                                    border: 'none',
                                    padding: '0.25rem 0.5rem',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                Delete
                            </button>
                        </div>
                    ))}
                </div>
                <div className="payers-list">
                    <h3>Manage Categories</h3>
                    <form onSubmit={handleAddCategory}>
                        <input
                            type="text"
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            placeholder="Add new category"
                            style={{
                                backgroundColor: theme.surface,
                                color: theme.text,
                                border: `1px solid ${theme.border}`
                            }}
                        />
                        <button type="submit">Add Category</button>
                    </form>
                    <div className="items-list">
                        {categories.map(category => (
                            <div key={category.id} className="list-item" style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '0.5rem',
                                margin: '0.5rem 0',
                                backgroundColor: theme.surface,
                                borderRadius: '4px'
                            }}>
                                <span>{category.name}</span>
                                <button
                                    onClick={() => handleDeleteCategory(category.id)}
                                    style={{
                                        backgroundColor: theme.error,
                                        color: '#fff',
                                        border: 'none',
                                        padding: '0.25rem 0.5rem',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Delete
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Settings;