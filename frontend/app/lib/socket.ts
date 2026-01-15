import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    // Backend LobbyGateway listens on '/quiz' namespace
    socket = io('https://localhost/quiz', {
      transports: ['polling', 'websocket'],
      withCredentials: true,
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => {
      console.log("[Socket] Connected to /quiz namespace");
    });

    socket.on("connect_error", (err) => {
      console.error("[Socket] Connection error:", err.message);
      if (err.message === "No access token in cookie") {
        console.warn("[Socket] Your session may have expired. Please try logging out and back in.");
      }
    });

    socket.on("disconnect", (reason) => {
      console.warn("[Socket] Disconnected:", reason);
    });
  }
  return socket;
}
