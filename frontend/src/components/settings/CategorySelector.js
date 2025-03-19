import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { addCategory, deleteCategory } from '../../api';
import { FaPlus, FaTrash } from 'react-icons/fa';

function CategorySelector({ categories, selectedCategory, onSelect, currentUser, currentList, onCategoriesChange }) {
  const { theme } = useTheme();
  const [newCategory, setNewCategory] = useState('');

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;

    try {
      const result = await addCategory({
        name: newCategory.trim(),
        username: currentUser,
        list_id: currentList.id
      });

      if (result && result.id) {
        if (onCategoriesChange) {
          onCategoriesChange([...categories, result]);
        }
        onSelect(result.name);
        setNewCategory('');
      }
    } catch (error) {
      console.error('Error adding category:', error);
    }
  };

  const handleDeleteCategory = async (id) => {
    try {
      await deleteCategory(id);
      onCategoriesChange(categories.filter(category => category.id !== id));
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  return (
    <div className="category-selector" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddCategory();
            }
          }}
          placeholder="Add new category"
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: '6px',
            border: `1px solid ${theme.border}`,
            backgroundColor: theme.background,
            color: theme.text
          }}
        />
        <button
          type="button"
          onClick={handleAddCategory}
          disabled={!newCategory.trim()}
          style={{
            padding: '8px 16px',
            backgroundColor: theme.primary,
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            opacity: !newCategory.trim() ? 0.7 : 1
          }}
        >
          <FaPlus /> Add
        </button>
      </div>

      <div style={{ 
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        {categories.map(category => (
          <div
            key={category.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <button
              type="button"
              onClick={() => onSelect(category.name)}
              style={{
                padding: '8px 12px',
                backgroundColor: selectedCategory === category.name ? theme.primary : theme.surface,
                color: selectedCategory === category.name ? '#fff' : theme.text,
                border: `1px solid ${theme.border}`,
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              {category.name}
            </button>
            <button
              type="button"
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
              <FaTrash size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CategorySelector;