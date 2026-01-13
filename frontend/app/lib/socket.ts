import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    // Backend LobbyGateway listens on '/quiz' namespace
    socket = io('https://localhost/quiz', {
      transports: ['polling', 'websocket'],
      withCredentials: true,
      autoConnect: false,
    });
  }
  return socket;
}
