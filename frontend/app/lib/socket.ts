import { io, Socket } from 'socket.io-client';

const sockets: Record<string, Socket> = {};

export function getSocket(namespace = '/quiz'): Socket {
  if (!sockets[namespace]) {
    // Backend LobbyGateway listens on '/quiz' namespace
    // Use relative path so it works with both localhost and public domain
    sockets[namespace] = io(namespace, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      autoConnect: true,
    });
  }
  return sockets[namespace];
}
