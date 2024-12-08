import axios from 'axios';

export const baseApiUrl = window.location.hostname === 'localhost' ? 'http://localhost:5000' : '/api';

export const API = axios.create({ 
  baseURL: baseApiUrl,
});