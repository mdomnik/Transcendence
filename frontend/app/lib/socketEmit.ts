import { Socket } from "socket.io-client";

export async function emitWithAck<T = any>(
  socket: Socket,
  event: string,
  payload?: any,
  timeoutMs = 60000,
): Promise<T> {
  // Ensure connection before emitting
  if (!socket.connected) {
    console.warn(`[socketEmit] Socket not connected for event "${event}". Attempting to connect...`);
    socket.connect();
    
    await new Promise<void>((resolve, reject) => {
      const onConnect = () => {
        socket.off("connect_error", onConnectError);
        resolve();
      };
      const onConnectError = (err: any) => {
        socket.off("connect", onConnect);
        reject(new Error(`SOCKET_CONNECTION_FAILED: ${err.message}`));
      };

      socket.once("connect", onConnect);
      socket.once("connect_error", onConnectError);

      // Timeout for connection attempt
      setTimeout(() => {
        socket.off("connect", onConnect);
        socket.off("connect_error", onConnectError);
        reject(new Error("SOCKET_CONNECTION_TIMEOUT"));
      }, 10000);
    });
  }

  return new Promise((resolve, reject) => {
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
