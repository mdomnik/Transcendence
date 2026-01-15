import { Socket } from "socket.io-client";

export function emitWithAck<T = any>(
  socket: Socket,
  event: string,
  payload?: any,
  timeoutMs = 600000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!socket.connected) {
      reject(new Error("SOCKET_NOT_CONNECTED"));
      return;
    }

    let timeout: NodeJS.Timeout;

    const onTimeout = () => {
      cleanup();
      reject(new Error("TIMEOUT"));
    };

    const cleanup = () => {
      clearTimeout(timeout);
    };

    timeout = setTimeout(onTimeout, timeoutMs);

    socket.emit(event, payload ?? {}, (response: any) => {
      cleanup();

      if (!response) {
        reject(new Error("NO_RESPONSE"));
        return;
      }

      if (response.ok) {
        resolve(response.data);
      } else {
        reject(new Error(response.error || "UNKNOWN_ERROR"));
      }
    });
  });
}
