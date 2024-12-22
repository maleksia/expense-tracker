import React from 'react';
import '../../styles/components/_notification.css';

export const Notification = ({ message, type, onClose }) => (
  <div className={`notification ${type}`}>
    <p>{message}</p>
    <button onClick={onClose}>&times;</button>
  </div>
);