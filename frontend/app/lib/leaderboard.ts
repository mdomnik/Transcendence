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
    socket.emit("leaderboard:get");

    socket.once("leaderboard:data", (res) => {
      if (!res?.ok) {
        reject("FAILED");
        return;
      }
      console.log('data received', res.data);
      resolve(res.data);
    });
  });
}
