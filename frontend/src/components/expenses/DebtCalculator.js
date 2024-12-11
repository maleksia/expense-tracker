import React, { useState, useEffect } from 'react';
import { initializeWebSocket, calculateDebtsRealTime } from '../../api';
import { socket } from '../../api';
import { useTheme } from '../../context/ThemeContext';

function DebtCalculator({ currentUser, currentList }) {
  const { theme } = useTheme();
  const [debts, setDebts] = useState({});

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
    <div className="debt-calculator" style={{
      backgroundColor: theme.surface,
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <h2 style={{ marginBottom: '20px' }}>Debt Summary</h2>
      <div className="debt-sections">
        {Object.entries(calculateNetDebts(debts)).map(([debtor, creditors]) =>
          Object.entries(creditors).map(([creditor, amount]) => (
            <div
              key={`${debtor}-${creditor}`}
              style={{
                padding: '10px',
                marginBottom: '10px',
                backgroundColor: theme.background,
                borderRadius: '4px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span>{debtor} owes {creditor}:</span>
              <span style={{
                fontWeight: 'bold',
                color: amount > 1000 ? theme.error : theme.text
              }}>
                {amount.toFixed(2)} €
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default DebtCalculator;