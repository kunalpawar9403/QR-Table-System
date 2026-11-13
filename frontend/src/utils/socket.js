import { io } from 'socket.io-client';
import { getApiBaseUrl } from './apiConfig';

const serverUrl = getApiBaseUrl();

// Connect to backend with direct WebSocket transport for instant 0ms real-time delivery
export const socket = io(serverUrl || undefined, {
  transports: ['websocket', 'polling'],
  upgrade: true,
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 300,
  reconnectionDelayMax: 1500,
  timeout: 10000
});
