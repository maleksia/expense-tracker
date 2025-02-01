import React, { useState, useEffect } from 'react';
import { initializeWebSocket, calculateDebtsRealTime } from '../../api';
import { socket } from '../../api';
import { useTheme } from '../../context/ThemeContext';
import { useCurrency } from '../../context/CurrencyContext';

function DebtCalculator({ currentUser, currentList }) {
  const { theme } = useTheme();
  const { listCurrencies } = useCurrency();
  const [debts, setDebts] = useState({});

  const currencySymbols = {
    'EUR': '€',
    'USD': '$',
    'GBP': '£'
  };

  const currentCurrency = listCurrencies[currentList?.id] || 'EUR';

  useEffect(() => {
    const fetchDebts = async () => {
      if (!currentList?.id) {
        console.log('No list ID available');
        return;
      }

      try {
        console.log('Fetching debts for:', {
          currentUser,
          listId: currentList.id
        });

        const result = await calculateDebtsRealTime(currentUser, currentList.id);
        console.log('Debt calculation result:', result);
        setDebts(result);
      } catch (error) {
        console.error('Error fetching debts:', error);
      }
    };

    fetchDebts();

    // Update socket event to use list ID
    if (currentList?.id) {
      const eventName = `expensesUpdated_${currentUser}_${currentList.id}`;
      console.log('Socket event name:', eventName);

      initializeWebSocket(currentUser, currentList.id, (updatedDebts) => {
        console.log('Received socket update:', updatedDebts);
        setDebts(updatedDebts);
      });

      return () => {
        socket.off(eventName);
      };
    }
  }, [currentUser, currentList]);

  const calculateNetDebts = (debts) => {
    const netDebts = {};

    Object.entries(debts).forEach(([debtor, creditors]) => {
      Object.entries(creditors).forEach(([creditor, amount]) => {
        const reverseDebt = debts[creditor]?.[debtor] || 0;
        const netAmount = amount - reverseDebt;

        if (netAmount > 0) {
          if (!netDebts[debtor]) netDebts[debtor] = {};
          netDebts[debtor][creditor] = netAmount;
        }
      });
    });

    return netDebts;
  };

  return (
    <div className="component-container">
      <div className="component-header">
        <h2 className="component-title">Debt Summary</h2>
      </div>

      <div className="debt-sections" style={{
        backgroundColor: theme.currentTheme === 'dark' ? '#1e1e1e' : theme.background,
        borderRadius: '8px',
        padding: '16px',
      }}>
        {Object.entries(calculateNetDebts(debts)).length === 0 ? (
          <div style={{ 
            textAlign: 'center',
            padding: '32px',
            color: theme.textSecondary
          }}>
            <p style={{ margin: 0 }}>No outstanding debts.</p>
          </div>
        ) : (
          Object.entries(calculateNetDebts(debts)).map(([debtor, creditors]) =>
            Object.entries(creditors).map(([creditor, amount]) => (
              <div
                key={`${debtor}-${creditor}`}
                style={{
                  padding: '16px',
                  marginBottom: '8px',
                  backgroundColor: theme.currentTheme === 'dark' ? '#242424' : theme.surface,
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  border: `1px solid ${theme.border}`,
                  transition: 'transform 0.2s ease',
                  cursor: 'default',
                  ':hover': {
                    transform: 'translateY(-2px)'
                  }
                }}
              >
                <span style={{ 
                  color: theme.text,
                  fontWeight: '500'
                }}>
                  <span style={{ color: theme.textSecondary }}>From </span>
                  {debtor}
                  <span style={{ color: theme.textSecondary }}> to </span>
                  {creditor}:
                </span>
                <span style={{
                  fontWeight: 'bold',
                  color: amount > 1000 ? theme.error : theme.success,
                  fontSize: '1.1rem'
                }}>
                  {amount.toFixed(2)} {currencySymbols[currentCurrency]}
                </span>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
}

export default DebtCalculator;