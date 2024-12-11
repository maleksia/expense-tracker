import { API } from './config';

export const fetchLists = async (username) => {
    const response = await API.get(`/lists?username=${username}`);
    return response.data;
  };
  
  export const createList = async (listData) => {
    const response = await API.post('/lists', listData);
    return response.data;
  };
  
  export const updateList = async (listId, listData) => {
    const response = await API.put(`/lists/${listId}`, listData);
    return response.data;
  };