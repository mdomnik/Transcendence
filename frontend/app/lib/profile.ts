export interface MatchHistory {
  id: string;
  topic: string;
  score: number;
  won: boolean;
  playedAt: string;
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
    { id: '1', topic: 'JavaScript Basics', score: 850, won: true, playedAt: '2023-11-15T14:30:00Z' },
    { id: '2', topic: 'React Hooks', score: 620, won: false, playedAt: '2023-11-14T10:15:00Z' },
    { id: '3', topic: 'TypeScript Advanced', score: 1000, won: true, playedAt: '2023-11-13T16:45:00Z' },
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
