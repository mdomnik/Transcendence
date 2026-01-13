import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io('/quiz', {
      transports: ['websocket'],
      withCredentials: true,
      autoConnect: false,
    });
  }
  return socket;
}
