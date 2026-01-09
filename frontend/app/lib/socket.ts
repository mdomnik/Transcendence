import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io('http://localhost:3000/quiz', {
      transports: ['websocket'],
    });
  }
  return socket;
}
