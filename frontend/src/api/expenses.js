import { API } from './config';
import { socket } from './socket';

export const fetchExpenses = (username, listId) => {
  return API.get(`/expenses?username=${username}&list_id=${listId}`)
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

export const updateExpense = async (id, expenseData) => {
  try {
    const response = await API.put(`/update-expense/${id}`, expenseData);
    socket.emit('expenseUpdated', expenseData);
    return response.data;
  } catch (error) {
    console.error("Error updating expense:", error);
    throw error;
  }
};

export const fetchExpensesByDate = (start, end) =>
  API.get(`/expenses-by-date?start=${start}&end=${end}`);