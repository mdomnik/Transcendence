import { getSocket } from "./socket";

export interface LeaderboardEntry {
  userId: string;
  username: string;
  avatarPath?: string;
  gamesWon: number;
  gamesPlayed: number;
  winRate: number;
  accuracy: number;
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const socket = getSocket();

  // Don't wait forever for connection - if not connected, try to connect but proceed
  if (!socket.connected) {
    socket.connect();
    // Wait max 2 seconds for connection
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, 2000);
      socket.once("connect", () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }

  return new Promise((resolve, reject) => {
    // Timeout the request after 5 seconds
    const timeout = setTimeout(() => {
      reject(new Error("Leaderboard timeout"));
    }, 5000);

    socket.emit("leaderboard:get");

    socket.once("leaderboard:data", (res) => {
      clearTimeout(timeout);
      if (!res?.ok) {
        reject(new Error("FAILED"));
        return;
      }
      console.log('data received', res.data);
      resolve(res.data);
    });
  });
}
