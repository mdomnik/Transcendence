import { getSocket } from "./socket";

export interface LeaderboardEntry {
  id: string;
  username: string;
  avatarPath?: string;
  gamesWon: number;
  gamesPlayed: number;
  winRate: number;
  accuracy: number;
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const socket = getSocket();

  if (!socket.connected) {
    await new Promise<void>((resolve) => {
      socket.once("connect", resolve);
      socket.connect();
    });
  }

  return new Promise((resolve, reject) => {
    socket.emit("leaderboard:get", {}, (res: any) => {
      if (!res || !res.ok) {
        reject(res?.error || "FAILED_TO_FETCH_LEADERBOARD");
        return;
      }

      resolve(res.data);
    });
  });
}
