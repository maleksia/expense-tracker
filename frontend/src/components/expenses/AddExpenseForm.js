import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { fetchCategories } from '../../api';
import ParticipantsSelector from '../settings/ParticipantsSelector';
import CategorySelector from '../settings/CategorySelector';
import { FaUserCog } from 'react-icons/fa';

function AddExpenseForm({ onSubmit, currentUser, currentList, initialData = null, onCancel = null }) {
  const { theme } = useTheme();
  const initialFormState = {
    payer: '',
    amount: '',
    description: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
    participants: []
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        amount: initialData.amount.toString(),
        participants: initialData.participants || []
      });
    }
  }, [initialData]);

  const [payers, setPayers] = useState([]); // registered participants: objects { username, name }
  const [nonRegisteredPayers, setNonRegisteredPayers] = useState([]); // non-registered: array of strings
  const [categories, setCategories] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!currentList) {
          setError('No list data available');
          return;
        }

        // Convert registered participants array from strings to objects with username and name
        const registered = (currentList.registered_participants || []).map(username => ({
          username: username,
          name: username
        }));
        const nonRegistered = currentList.non_registered_participants || [];

        setPayers(registered);
        setNonRegisteredPayers(nonRegistered);

        // Create initial participants list with type prefixes
        const initialParticipants = [
          ...registered.map(p => `registered:${p.name}`),
          ...nonRegistered.map(name => `nonRegistered:${name}`)
        ];

        setFormData(prev => ({
          ...prev,
          participants: initialParticipants
        }));

        const categoriesList = await fetchCategories(currentUser, currentList.id);
        setCategories(categoriesList);
      } catch (error) {
        setError('Failed to load data');
      }
    };
    loadData();
  }, [currentUser, currentList]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentList) {
      setError('No list selected');
      return;
    }

    if (!formData.payer.trim()) {
      setError('Please select a payer');
      return;
    }

    if (!formData.category.trim()) {
      setError('Please select or enter a category');
      return;
    }

    if (!formData.amount || formData.amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (!formData.description.trim()) {
      setError('Please enter a description');
      return;
    }

    setIsSubmitting(true);

    try {
        // Create complete payer identifier if not already prefixed
        const payerWithPrefix = formData.payer.includes(':') 
            ? formData.payer 
            : `${formData.payerType}:${formData.payer}`;

        const success = await onSubmit({
            ...formData,
            payer: payerWithPrefix,
            // participants already have prefixes from ParticipantsSelector
        });
      if (success) {
        setFormData(initialFormState);
      }
    } catch (error) {
      console.error('Error submitting expense:', error);
      setError(error.message || 'Failed to add expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayerSelection = (payerType, payerValue) => {
    setFormData(prev => ({ 
      ...prev, 
      payer: payerValue,
      payerType: payerType // Store the type of payer (registered/non-registered)
    }));
  };

  const handleCancel = () => {
    setFormData(initialFormState);
    setError('');
    onCancel();
  };

  const handleCategoryChange = (updatedCategories) => {
    setCategories(updatedCategories);
  };

  return (
    <div className="component-container">
      <div className="component-header">
        <h2 className="component-title">
          {initialData ? 'Edit Expense' : 'Add New Expense'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="expense-form-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '32px',
        rowGap: '40px',
        marginTop: '24px',
        padding: '8px'
      }}>
        {/* First row */}
        <div className="form-group" style={{ 
          gridColumn: 'span 1',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <label className="form-label" style={{ 
            color: theme.textSecondary,
            marginBottom: '8px',
            display: 'block',
            fontSize: '0.9rem'
          }}>Payer</label>
          
          <div style={{ 
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            {payers.map((p) => (
              <button 
                type="button"
                key={`registered:${p.username}`} 
                onClick={() => handlePayerSelection('registered', p.name)}
                style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px 16px',
                  borderRadius: '20px',
                  border: 'none',
                  backgroundColor: formData.payer === p.name && formData.payerType === 'registered' 
                    ? theme.primary 
                    : theme.surface,
                  color: formData.payer === p.name && formData.payerType === 'registered'
                    ? 'white' 
                    : theme.text,
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '500'
                }}
              >
                <FaUserCog style={{ marginRight: '8px', fontSize: '1.1rem' }} /> {/* Increased icon size */}
                {p.name}
              </button>
            ))}
            {nonRegisteredPayers.map((name) => (
              <button
                type="button"
                key={`nonRegistered:${name}`}
                onClick={() => handlePayerSelection('nonRegistered', name)}
                style={{ 
                  padding: '10px 16px',
                  borderRadius: '20px',
                  border: 'none',
                  backgroundColor: formData.payer === name && formData.payerType === 'nonRegistered'
                    ? theme.primary 
                    : theme.surface,
                  color: formData.payer === name && formData.payerType === 'nonRegistered'
                    ? 'white' 
                    : theme.text,
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '500'
                }}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group" style={{ gridColumn: 'span 1' }}>
          <label className="form-label" style={{ 
            color: theme.textSecondary,
            marginBottom: '8px',
            display: 'block',
            fontSize: '0.9rem'
          }}>Amount</label>
          <input
            type="number"
            step="0.01"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            required
            style={{
              width: '100%',
              padding: '10px 12px',
              backgroundColor: theme.background,
              color: theme.text,
              border: `1px solid ${theme.border}`,
              borderRadius: '6px',
              fontSize: '1rem'
            }}
          />
        </div>

        <div className="form-group" style={{ gridColumn: 'span 1' }}>
          <label className="form-label" style={{ color: theme.textSecondary, marginBottom: '8px', display: 'block', fontSize: '0.9rem' }}>Category</label>
          <CategorySelector
            categories={categories}
            selectedCategory={formData.category}
            onSelect={(category) => setFormData({ ...formData, category })}
            currentUser={currentUser}
            currentList={currentList}
            onCategoriesChange={handleCategoryChange}
          />
        </div>

        {/* Second row */}
        <div className="form-group" style={{ gridColumn: 'span 1' }}>
          <label className="form-label" style={{ color: theme.textSecondary, marginBottom: '8px', display: 'block', fontSize: '0.9rem' }}>Description</label>
          <input
            type="text"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            required
            style={{
              width: '100%',
              padding: '10px 12px',
              backgroundColor: theme.background,
              color: theme.text,
              border: `1px solid ${theme.border}`,
              borderRadius: '6px',
              fontSize: '1rem'
            }}
          />
        </div>

        <div className="form-group" style={{ gridColumn: 'span 1' }}>
          <label className="form-label" style={{ color: theme.textSecondary, marginBottom: '8px', display: 'block', fontSize: '0.9rem' }}>Date</label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
            style={{
              width: '100%',
              padding: '10px 12px',
              backgroundColor: theme.background,
              color: theme.text,
              border: `1px solid ${theme.border}`,
              borderRadius: '6px',
              fontSize: '1rem'
            }}
          />
        </div>

        <div className="form-group" style={{ gridColumn: 'span 1' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '8px'
          }}>
            <label className="form-label" style={{ color: theme.textSecondary, fontSize: '0.9rem' }}>Participants</label>
            <div
              style={{
                display: 'inline-block',
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                backgroundColor: theme.primary,
                color: '#fff',
                fontSize: '12px',
                textAlign: 'center',
                lineHeight: '16px',
                cursor: 'help'
              }}
              title="Choose who participates in splitting this expense. By default, all list members are included. Deselect members who don't participate in this expense."
            >
              i
            </div>
          </div>
          <ParticipantsSelector
            registeredPayers={payers}
            nonRegisteredPayers={nonRegisteredPayers}
            participants={formData.participants}
            onSelect={(participants) => setFormData({ ...formData, participants })}
          />
        </div>

        <div style={{ 
          display: 'flex',
          gap: '12px',
          gridColumn: '1 / -1',
          marginTop: '32px'
        }}>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              backgroundColor: theme.primary,
              color: '#fff',
              padding: '12px 24px',
              border: 'none',
              borderRadius: '6px',
              fontSize: '1rem',
              fontWeight: '500',
              cursor: 'pointer',
              opacity: isSubmitting ? 0.7 : 1,
              flex: '1'
            }}
          >
            {isSubmitting ? 'Saving...' : initialData ? 'Save Changes' : 'Add Expense'}
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={handleCancel}
              style={{
                backgroundColor: theme.surface,
                color: theme.text,
                padding: '12px 24px',
                border: `1px solid ${theme.border}`,
                borderRadius: '6px',
                fontSize: '1rem',
                fontWeight: '500',
                cursor: 'pointer',
                flex: '1'
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
      {error && (
        <div style={{ 
          color: theme.error,
          backgroundColor: `${theme.error}15`,
          padding: '12px',
          borderRadius: '6px',
          marginTop: '16px',
          fontSize: '0.9rem'
        }}>
          {error}
        </div>
      )}
    </div>
  );
}

export default AddExpenseForm;