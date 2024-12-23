import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { fetchCategories, addCategory, deleteCategory } from '../../api';

function Settings({ currentUser, currentList, fromList }) {
    const { currentTheme, setCurrentTheme, theme } = useTheme();
    const [newCategory, setNewCategory] = useState('');
    const [categories, setCategories] = useState([]);

    const showCategories = Boolean(currentList);

    useEffect(() => {
        if (showCategories) {
            const loadCategories = async () => {
                try {
                    const categoriesList = await fetchCategories(currentUser, currentList.id);
                    setCategories(categoriesList);
                } catch (error) {
                    console.error('Error loading categories:', error);
                }
            };
            loadCategories();
        }
    }, [currentUser, showCategories, currentList]);

    const handleAddCategory = async (e) => {
        e.preventDefault();
        if (!newCategory.trim()) {
            return;
        }
        try {
            const added = await addCategory({
                name: newCategory,
                username: currentUser,
                list_id: currentList.id
            });
            setCategories([...categories, added]);
            setNewCategory('');
        } catch (error) {
            console.error('Error adding category:', error);
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
        <div style={{
            padding: '20px',
            maxWidth: '800px',
            margin: '0 auto'
        }}>
            <h2 style={{ color: theme.text, marginBottom: '30px' }}>Settings</h2>

            {/* Theme Selection - Always visible */}
            <div style={{
                backgroundColor: theme.surface,
                padding: '20px',
                borderRadius: '8px',
                marginBottom: '20px'
            }}>
                <h3 style={{ color: theme.text, marginBottom: '15px' }}>Theme</h3>
                <select
                    value={currentTheme}
                    onChange={(e) => setCurrentTheme(e.target.value)}
                    style={{
                        padding: '8px',
                        borderRadius: '4px',
                        border: `1px solid ${theme.border}`,
                        backgroundColor: theme.background,
                        color: theme.text
                    }}
                >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="forest">Forest</option>
                </select>
            </div>

            {/* List-specific settings */}
            {showCategories && (
                <div style={{
                    backgroundColor: theme.surface,
                    padding: '20px',
                    borderRadius: '8px',
                    marginBottom: '20px'
                }}>
                    <h3 style={{ color: theme.text, marginBottom: '15px' }}>Manage Categories</h3>
                    <form onSubmit={handleAddCategory} style={{ marginBottom: '15px' }}>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <input
                                type="text"
                                value={newCategory}
                                onChange={(e) => setNewCategory(e.target.value)}
                                placeholder="Add new category"
                                style={{
                                    flex: 1,
                                    padding: '8px',
                                    borderRadius: '4px',
                                    border: `1px solid ${theme.border}`,
                                    backgroundColor: theme.background,
                                    color: theme.text
                                }}
                            />
                            <button
                                type="submit"
                                style={{
                                    padding: '8px 16px',
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
                    </form>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {categories.map(category => (
                            <div
                                key={category.id}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '10px',
                                    backgroundColor: theme.background,
                                    borderRadius: '4px'
                                }}
                            >
                                <span style={{ color: theme.text }}>{category.name}</span>
                                <button
                                    onClick={() => handleDeleteCategory(category.id)}
                                    style={{
                                        padding: '4px 8px',
                                        backgroundColor: theme.error,
                                        color: '#fff',
                                        border: 'none',
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
            )}

            {/* Home view features */}
            {!showCategories && (
                <div style={{
                    backgroundColor: theme.surface,
                    padding: '20px',
                    borderRadius: '8px'
                }}>
                    <h3 style={{ color: theme.text, marginBottom: '15px' }}>Coming Soon</h3>
                </div>
            )}
        </div>
    );
}

export default Settings;