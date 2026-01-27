import { io, Socket } from 'socket.io-client';

/**
 * SINGLETON PATTERN: 
 * We store socket instances in a record to ensure that we only ever create 
 * ONE connection per namespace. This prevents memory leaks and redundant 
 * WebSocket connections when navigating between pages.
 */
const sockets: Record<string, Socket> = {};

export function getSocket(namespace = '/quiz'): Socket {
  if (!sockets[namespace]) {
    /**
     * namespace: '/quiz' is where our game and lobby logic resides on the backend.
     * transports: ['websocket'] ensures we use the most efficient protocol immediately.
     * withCredentials: true is CRITICAL - it allows the browser to send our Auth HttpOnly cookies
     * to the backend for WebSocket authentication.
     */
    sockets[namespace] = io(namespace, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      autoConnect: true,
    });
  }
  return sockets[namespace];
}
