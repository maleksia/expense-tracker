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
    <div className="component-container">
      <div className="component-header">
        <h2 className="component-title">Add New Expense</h2>
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
          <PayerSelector
            payers={payers}
            selectedPayer={formData.payer}
            onSelect={(payer) => setFormData({ ...formData, payer })}
          />
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
            payers={payers}
            selectedParticipants={formData.participants}
            onSelect={(participants) => setFormData({ ...formData, participants })}
          />
        </div>

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
            transition: 'transform 0.2s, opacity 0.2s',
            gridColumn: '1 / -1',
            marginTop: '32px'
          }}
        >
          {isSubmitting ? 'Adding...' : 'Add Expense'}
        </button>
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