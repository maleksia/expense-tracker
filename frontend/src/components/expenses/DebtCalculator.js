import React, { useState, useEffect } from 'react';
import { initializeWebSocket, calculateDebtsRealTime } from '../../api';
import { socket } from '../../api'; 
import { useTheme } from '../../context/ThemeContext';

function DebtCalculator({ expenses, currentUser }) {
  const { theme } = useTheme();
  const [debts, setDebts] = useState({});

  useEffect(() => {
    const fetchDebts = async () => {
      try {
        const result = await calculateDebtsRealTime(currentUser);
        setDebts(result);
      } catch (error) {
        console.error('Error fetching debts:', error);
      }
    };

    fetchDebts();
    initializeWebSocket(currentUser, setDebts);

    // Cleanup function
    return () => {
      socket.off(`expensesUpdated_${currentUser}`);
    };
  }, [currentUser]);

  if (!debts || Object.keys(debts).length === 0) {
    return <p>No debts to display.</p>;
  }

  const groupedDebts = Object.entries(debts).reduce((acc, [debtor, creditors]) => {
    if (!acc[debtor]) {
      acc[debtor] = [];
    }
    Object.entries(creditors).forEach(([creditor, amount]) => {
      acc[debtor].push({ creditor, amount });
    });
    return acc;
  }, {});

  if (!Object.keys(debts).length) {
    return <p>No debts to display.</p>;
  }

  const calculateNetDebts = (debts) => {
    const netDebts = {};
    
    Object.entries(debts).forEach(([debtor, creditors]) => {
      Object.entries(creditors).forEach(([creditor, amount]) => {
        // Check if there's a reverse debt
        const reverseDebt = debts[creditor]?.[debtor] || 0;
        
        // Calculate net debt
        const netAmount = amount - reverseDebt;
        
        // Only store if there's a positive net debt
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