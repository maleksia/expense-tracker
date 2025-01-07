import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { fetchCategories, addCategory, deleteCategory } from '../../api';
import { useCurrency } from '../../context/CurrencyContext';

function ListSettings({ currentUser, currentList }) {
  const { currentTheme, setCurrentTheme, theme } = useTheme();
  const [newCategory, setNewCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const { listCurrencies, setCurrencyForList } = useCurrency();

  const currencies = [
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'GBP', symbol: '£', name: 'British Pound' }
  ];

  const handleCurrencyChange = (e) => {
    setCurrencyForList(currentList.id, e.target.value);
  };

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const categoriesList = await fetchCategories(currentUser, currentList.id);
        setCategories(categoriesList);
      } catch (error) {
        console.error('Error loading categories:', error);
      }
    };
    loadCategories();
  }, [currentUser, currentList]);

  const handleAddCategory = async (e) => {
    e.preventDefault();
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
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ color: theme.text, marginBottom: '30px' }}>List Settings</h2>

      <div style={{ backgroundColor: theme.surface, padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
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

      <div style={{
        backgroundColor: theme.surface,
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h3 style={{ color: theme.text, marginBottom: '15px' }}>Currency</h3>
        <select
          value={listCurrencies[currentList.id] || 'EUR'}
          onChange={handleCurrencyChange}
          style={{
            padding: '8px',
            borderRadius: '4px',
            border: `1px solid ${theme.border}`,
            backgroundColor: theme.background,
            color: theme.text
          }}
        >
          {currencies.map(curr => (
            <option key={curr.code} value={curr.code}>
              {curr.name} ({curr.symbol})
            </option>
          ))}
        </select>
      </div>

      <div style={{ backgroundColor: theme.surface, padding: '20px', borderRadius: '8px' }}>
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
            <button type="submit" style={{
              padding: '8px 16px',
              backgroundColor: theme.primary,
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}>
              Add
            </button>
          </div>
        </form>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {categories.map(category => (
            <div key={category.id} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px',
              backgroundColor: theme.background,
              borderRadius: '4px'
            }}>
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
    </div>
  );
}

export default ListSettings;