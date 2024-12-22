import React from 'react';
import '../../styles/components/_dialog.css';

export const ConfirmDialog = ({ isOpen, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="dialog-overlay">
      <div className="dialog">
        <p>{message}</p>
        <div className="dialog-buttons">
          <button onClick={onCancel} className="cancel-btn">Cancel</button>
          <button onClick={onConfirm} className="confirm-btn">Confirm</button>
        </div>
      </div>
    </div>
  );
};