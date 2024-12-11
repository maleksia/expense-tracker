import { API } from './config';

// Payer management
export const fetchPayers = async (username) => {
  const response = await API.get(`/payers?username=${username}`);
  return response.data;
};

export const addPayer = async (payerData) => {
  const response = await API.post('/payers', payerData);
  return response.data;
};

export const deletePayer = async (id) => {
  const response = await API.delete(`/payers/${id}`);
  return response.data;
};

// Category management
export const fetchCategories = async (username, listId) => {
  const response = await API.get(`/categories?username=${username}&list_id=${listId}`);
  return response.data;
};

export const addCategory = async (categoryData) => {
  const response = await API.post('/categories', categoryData);
  return response.data;
};

export const deleteCategory = async (id) => {
  const response = await API.delete(`/categories/${id}`);
  return response.data;
};

// Trash management
export const fetchTrash = async (username, listId) => {
  const response = await API.get(`/trash?username=${username}&list_id=${listId}`);
  return response.data;
};

export const restoreExpense = async (id) => {
  const response = await API.post(`/restore/${id}`);
  return response.data;
};