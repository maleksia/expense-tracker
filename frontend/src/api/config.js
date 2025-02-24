import axios from 'axios';

// Update baseApiUrl to use HTTPS for production
export const baseApiUrl = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000' 
  : 'https://aleksi.pro/api';

export const API = axios.create({ 
  baseURL: baseApiUrl,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});