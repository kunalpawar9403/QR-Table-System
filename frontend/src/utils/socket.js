import { io } from 'socket.io-client';

// Connect to backend with direct WebSocket transport for instant 0ms real-time delivery
export const socket = io({
  transports: ['websocket', 'polling'],
  upgrade: true,
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 300,
  reconnectionDelayMax: 1500,
  timeout: 10000
});
