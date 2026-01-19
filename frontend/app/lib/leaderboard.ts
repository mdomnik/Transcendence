export interface LeaderboardEntry {
  id: string;
  username: string;
  avatarPath?: string;
  gamesWon: number;
  gamesPlayed: number;
  winRate: number;
  accuracy: number;
}

const mockLeaderboard: LeaderboardEntry[] = [
  { id: '1', username: 'HyperCoder', gamesWon: 45, gamesPlayed: 50, winRate: 0.9, accuracy: 0.85 },
  { id: '2', username: 'PrismaKing', gamesWon: 38, gamesPlayed: 45, winRate: 0.84, accuracy: 0.78 },
  { id: '3', username: 'ReactQueen', gamesWon: 32, gamesPlayed: 40, winRate: 0.8, accuracy: 0.92 },
  { id: '4', username: 'TailwindFan', gamesWon: 28, gamesPlayed: 42, winRate: 0.66, accuracy: 0.7 },
  { id: '5', username: 'NestGuru', gamesWon: 25, gamesPlayed: 35, winRate: 0.71, accuracy: 0.82 },
  { id: '6', username: 'ReduxWiz', gamesWon: 20, gamesPlayed: 30, winRate: 0.66, accuracy: 0.75 },
  { id: '7', username: 'DockerPro', gamesWon: 18, gamesPlayed: 28, winRate: 0.64, accuracy: 0.68 },
  { id: '8', username: 'JestMaster', gamesWon: 15, gamesPlayed: 25, winRate: 0.6, accuracy: 0.88 },
  { id: '9', username: 'GitMaster', gamesWon: 12, gamesPlayed: 22, winRate: 0.54, accuracy: 0.62 },
  { id: '10', username: 'ViteSpeed', gamesWon: 10, gamesPlayed: 20, winRate: 0.5, accuracy: 0.55 },
];

export const getLeaderboard = async (): Promise<LeaderboardEntry[]> => {
  // In a real frontend-only task, we might fetch from a real endpoint,
  // but since we want to show progress without backend changes, we'll return mock data.
  // We can simulate a delay to make it feel real.
  await new Promise(resolve => setTimeout(resolve, 800));
  
  try {
    const response = await fetch('/api/users/leaderboard', {
      credentials: 'include'
    });
    if (response.ok) {
      return response.json();
    }
  } catch (err) {
    console.warn('Leaderboard API not available, using mock data');
  }

  return mockLeaderboard;
};
