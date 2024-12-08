import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  transports: ['websocket'],
  autoConnect: true
});

export const initializeWebSocket = (username, onDebtsUpdate) => {
  socket.off(`expensesUpdated_${username}`);
  
  socket.on('connect', () => {
    console.log('Socket connected');
  });

  socket.on(`expensesUpdated_${username}`, (updatedDebts) => {
    console.log('Received real-time debt update:', updatedDebts);
    onDebtsUpdate(updatedDebts);
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });
};

export { socket };