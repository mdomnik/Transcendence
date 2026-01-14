import { Socket } from "socket.io-client";

export function emitWithAck<T>(
  socket: Socket,
  event: string,
  payload?: any,
  timeoutMs = 8000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("TIMEOUT"));
    }, timeoutMs);

    socket.emit(event, payload, (response: any) => {
      clearTimeout(timeout);

      if (!response) {
        reject(new Error("NO_ACK"));
      } else if (!response.ok) {
        reject(new Error(response.error || "UNKNOWN_ERROR"));
      } else {
        resolve(response.data);
      }
    });
  });
}