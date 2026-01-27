import { Socket } from "socket.io-client";

export function emitWithAck<T = any>(
  socket: Socket,
  event: string,
  payload?: any,
  timeoutMs = 360000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!socket.connected) {
      reject(new Error("SOCKET_NOT_CONNECTED"));
      return;
    }
    const timeout = setTimeout(() => {
      reject(new Error("ACK_TIMEOUT"));
    }, timeoutMs);

    socket.emit(event, payload ?? {}, (response: any) => {
      clearTimeout(timeout);

      if (!response) {
        reject(new Error("NO_ACK_RESPONSE"));
        return;
      }

      resolve(response);
    });
    /* let timeout: NodeJS.Timeout;

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
    }); */
  });
}
