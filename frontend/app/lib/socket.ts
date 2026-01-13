import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    // Backend LobbyGateway listens on '/quiz' namespace
    socket = io('https://localhost/quiz', {
      transports: ['websocket'],
      withCredentials: true,
      autoConnect: false,
      upgrade: false,
    });
  }
  return socket;
}
