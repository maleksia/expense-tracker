import { API } from './config';
import { socket } from './socket';

export const fetchExpenses = (username) => {
  return API.get(`/expenses?username=${username}`)
    .then(response => response.data)
    .catch(error => {
      console.error("Error fetching expenses:", error);
      throw error;
    });
};

export const addExpense = async (expenseData) => {
  try {
    const response = await API.post('/add-expense', expenseData);
    socket.emit('expenseAdded', expenseData);
    return response.data;
  } catch (error) {
    console.error("Error adding expense:", error);
    throw error;
  }
};

export const deleteExpense = async (expenseId) => {
  try {
    const response = await API.delete(`/delete-expense/${expenseId}`);
    socket.emit('expenseDeleted', expenseId);
    return response.data;
  } catch (error) {
    console.error("Error in deleteExpense:", error);
    throw error;
  }
};

export const updateExpense = (id, updatedExpense) =>
  API.put(`/update-expense/${id}`, updatedExpense);

export const fetchExpensesByDate = (start, end) =>
  API.get(`/expenses-by-date?start=${start}&end=${end}`);