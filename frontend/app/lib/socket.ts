import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io('https://localhost/quiz', {
      transports: ['websocket'],
      withCredentials: true,
      upgrade: false,
    });
  }
  return socket;
}
