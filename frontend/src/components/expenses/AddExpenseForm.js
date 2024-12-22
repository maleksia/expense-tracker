import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { fetchCategories } from '../../api';
import PayerSelector from '../settings/PayerSelector';
import ParticipantsSelector from '../settings/ParticipantsSelector';
import CategorySelector from '../settings/CategorySelector';

function AddExpenseForm({ onSubmit, currentUser, currentList }) {
  const { theme } = useTheme();
  const [formData, setFormData] = useState({
    payer: '',
    amount: '',
    description: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
    participants: []
  });
  const [payers, setPayers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!currentList || !currentList.participants) {
          setError('No list data available');
          return;
        }

        const payersList = currentList.participants.map((name, index) => ({
          id: index,
          name: name
        }));

        const categoriesList = await fetchCategories(currentUser, currentList.id);

        setPayers(payersList);
        setFormData(prev => ({
          ...prev,
          participants: currentList.participants
        }));
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
      setError('Please select or enter a payer');
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
      const success = await onSubmit(formData);
      if (success) {
        setFormData({
          payer: '',
          amount: '',
          description: '',
          category: '',
          date: new Date().toISOString().split('T')[0],
          participants: []
        });
      }
    } catch (error) {
      console.error('Error submitting expense:', error);
      setError(error.message || 'Failed to add expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="expense-form-card" style={{
      backgroundColor: theme.surface,
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-md)',
      padding: 'var(--spacing-xl)',
      marginBottom: 'var(--spacing-xl)'
    }}>
      <h2 style={{
        marginBottom: 'var(--spacing-lg)',
        color: theme.text,
        fontSize: '1.5rem',
        fontWeight: '600'
      }}>
        Add New Expense
      </h2>

      <form onSubmit={handleSubmit} className="expense-form-grid">
        <div className="form-group">
          <label className="form-label" style={{ color: theme.text }}>Payer</label>
          <PayerSelector
            payers={payers}
            selectedPayer={formData.payer}
            onSelect={(payer) => setFormData({ ...formData, payer })}
          />
        </div>

        <div className="form-group amount-field">
          <label className="form-label" style={{ color: theme.text }}>Amount</label>
          <input
            type="number"
            step="0.01"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            required
            className="form-input"
            style={{
              backgroundColor: theme.background,
              color: theme.text,
              border: `1px solid ${theme.border}`
            }}
          />
        </div>

        <div className="form-group">
          <label className="form-label" style={{ color: theme.text }}>Category</label>
          <CategorySelector
            categories={categories}
            selectedCategory={formData.category}
            onSelect={(category) => setFormData({ ...formData, category })}
          />
        </div>

        <div className="form-group">
          <label className="form-label" style={{ color: theme.text }}>Description</label>
          <input
            type="text"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            required
            className="form-input"
            style={{
              backgroundColor: theme.background,
              color: theme.text,
              border: `1px solid ${theme.border}`
            }}
          />
        </div>

        <div className="form-group date-field">
          <label className="form-label" style={{ color: theme.text }}>Date</label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
            className="form-input"
            style={{
              backgroundColor: theme.background,
              color: theme.text,
              border: `1px solid ${theme.border}`
            }}
          />
        </div>

        <div className="form-group">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '8px'
          }}>
            <label className="form-label" style={{ color: theme.text }}>Participants</label>
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
                cursor: 'help',
                position: 'relative'
              }}
              title="Choose who participates in splitting this expense. By default, all list members are included. Deselect members who don't participate in this expense."
            >
              i
            </div>
          </div>
          <ParticipantsSelector
            payers={payers}
            selectedParticipants={formData.participants}
            onSelect={(participants) => setFormData({ ...formData, participants })}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="submit-button"
          style={{
            backgroundColor: theme.primary,
            color: '#fff',
            opacity: isSubmitting ? 0.7 : 1,
            gridColumn: '1 / -1'
          }}
        >
          {isSubmitting ? 'Adding...' : 'Add Expense'}
        </button>
      </form>

      {error && (
        <div className="error-message" style={{ color: theme.error }}>
          {error}
        </div>
      )}
    </div>
  );
}

export default AddExpenseForm;