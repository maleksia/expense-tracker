import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';

function CategorySelector({ categories, selectedCategory, onSelect }) {
  const { theme } = useTheme();
  const [useManualInput, setUseManualInput] = useState(false);
  const [manualCategory, setManualCategory] = useState('');

  const handleManualSubmit = (e) => {
    e.preventDefault();
    onSelect(manualCategory);
  };

  return (
    <div className="category-selector" style={{ marginBottom: '1rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <button
          type="button"
          onClick={() => setUseManualInput(false)}
          style={{
            backgroundColor: !useManualInput ? theme.primary : theme.surface,
            color: !useManualInput ? '#fff' : theme.text,
            border: `1px solid ${theme.border}`,
            borderRadius: '4px 0 0 4px',
            padding: '0.5rem 1rem',
            cursor: 'pointer'
          }}
        >
          Saved Categories
        </button>
        <button
          type="button"
          onClick={() => setUseManualInput(true)}
          style={{
            backgroundColor: useManualInput ? theme.primary : theme.surface,
            color: useManualInput ? '#fff' : theme.text,
            border: `1px solid ${theme.border}`,
            borderRadius: '0 4px 4px 0',
            padding: '0.5rem 1rem',
            cursor: 'pointer'
          }}
        >
          New Category
        </button>
      </div>

      {useManualInput ? (
        <input
          type="text"
          value={manualCategory}
          onChange={(e) => setManualCategory(e.target.value)}
          onBlur={handleManualSubmit}
          placeholder="Enter category name"
          style={{
            padding: '0.5rem',
            borderRadius: '4px',
            border: `1px solid ${theme.border}`,
            backgroundColor: theme.surface,
            color: theme.text
          }}
        />
      ) : (
        <div>
          {categories.map(category => (
            <button
              key={category.id}
              type="button"
              onClick={() => onSelect(category.name)}
              style={{
                padding: '0.5rem 1rem',
                margin: '0 0.5rem',
                backgroundColor: selectedCategory === category.name ? theme.primary : theme.surface,
                color: selectedCategory === category.name ? '#fff' : theme.text,
                border: `1px solid ${theme.border}`,
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {category.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default CategorySelector;