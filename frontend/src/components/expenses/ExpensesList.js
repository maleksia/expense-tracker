import React from 'react';

// Päivämäärän muotoilu
function formatDate(dateString) {
  const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('fi-FI', options).format(date);
}

function ExpensesList({ expenses, handleDeleteExpense }) {
  return (
    <div>
      <h2>Recent Additions:</h2>
      <table>
        <thead>
          <tr>
            <th>Payer</th>
            <th>Amount</th>
            <th>Description</th>
            <th>Category</th>
            <th>Date</th>
            <th>Participants</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((expense) => (
            <tr key={expense.id}>
              <td>{expense.payer}</td>
              <td>{expense.amount}</td>
              <td>{expense.description}</td>
              <td>{expense.category}</td>
              <td>{formatDate(expense.date)}</td>
              <td>{expense.participants?.join(', ') || expense.payer}</td>
              <td>
                <button onClick={() => handleDeleteExpense(expense.id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ExpensesList;
