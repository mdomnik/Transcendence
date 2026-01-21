import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    // Backend LobbyGateway listens on '/quiz' namespace
    // Use relative path so it works with both localhost and public domain
    socket = io('/quiz', {
      transports: ['polling', 'websocket'],
      withCredentials: true,
      autoConnect: false,
    });
  }
  return socket;
}
