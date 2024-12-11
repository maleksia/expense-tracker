import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  transports: ['websocket'],
  autoConnect: true
});

export const initializeWebSocket = (username, listId, onDebtsUpdate) => {
  socket.off(`expensesUpdated_${username}_${listId}`);
  
  socket.on('connect', () => {
    console.log('Socket connected');
  });

  socket.on(`expensesUpdated_${username}_${listId}`, (updatedDebts) => {
    console.log('Received real-time debt update:', updatedDebts);
    if (typeof onDebtsUpdate === 'function') {
      onDebtsUpdate(updatedDebts);
    }
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });
};

export { socket };