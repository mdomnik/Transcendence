export interface MatchHistory {
  id: number;
  opponent: string;
  result: 'win' | 'loss';
  score: string;
  date: string;
  type: 'Ladder' | 'Custom';
}

export interface UserStats {
  rank: number;
  tier: string;
  wins: number;
  losses: number;
  winRate: number;
  matchesPlayed: number;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string; // Optional URL for image
  status: 'online' | 'offline' | 'in-game';
  stats: UserStats;
  matchHistory: MatchHistory[];
}

// Mock Data
export const mockUserProfile: UserProfile = {
  id: '1',
  username: 'PlayerOne',
  email: 'player@example.com',
  status: 'online',
  stats: {
    rank: 1205,
    tier: 'Diamond',
    wins: 45,
    losses: 12,
    winRate: 79,
    matchesPlayed: 57,
  },
  matchHistory: [
    { id: 1, opponent: 'SpeedDemon', result: 'win', score: '5 - 3', date: '2023-11-15', type: 'Ladder' },
    { id: 2, opponent: 'PongMaster', result: 'loss', score: '2 - 5', date: '2023-11-14', type: 'Ladder' },
    { id: 3, opponent: 'TheRookie', result: 'win', score: '5 - 0', date: '2023-11-13', type: 'Custom' },
  ]
};

// API Functions (Mocks for now)
export const getUserProfile = async (userId?: string): Promise<UserProfile> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  return mockUserProfile;
};

export const updateUserProfile = async (username: string, avatar?: File): Promise<Partial<UserProfile>> => {
  // In the real implementation, you would make a PATCH/PUT request to your backend
  // Example:
  // const formData = new FormData();
  // formData.append('username', username);
  // if (avatar) formData.append('avatar', avatar);
  // const res = await fetch('/api/users/me', { method: 'PATCH', body: formData });
  // return res.json();

  console.log("Saving to Backend...", { username, avatar });
  await new Promise(resolve => setTimeout(resolve, 800)); // Simulate network delay
  
  // Return the updated fields
  return {
    username,
    avatarUrl: avatar ? URL.createObjectURL(avatar) : undefined
  };
};
