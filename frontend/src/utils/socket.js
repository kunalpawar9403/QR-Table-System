import { io } from 'socket.io-client';

// Connect to backend (relative path uses current host / Vite proxy)
export const socket = io({
  autoConnect: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000
});
