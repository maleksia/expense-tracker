import { API } from './config';

export const calculateDebtsRealTime = async (username) => {
  try {
    const response = await API.get(`/calculate-debts?username=${username}`);
    return response.data;
  } catch (error) {
    console.error("Error calculating debts:", error);
    throw error;
  }
};

export const calculateDebts = () => API.get('/calculate-debts');