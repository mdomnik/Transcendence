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

// API Functions
export const getUserProfile = async (userId?: string): Promise<UserProfile> => {
  const url = userId ? `/api/users/${userId}` : '/api/users/me';
  
  const response = await fetch(url, {
    credentials: 'include'
  });
  if (!response.ok) {
    throw new Error('Failed to fetch profile');
  }
  
  const data = await response.json();
  
  // Map backend data to frontend UserProfile interface
  return {
    id: data.id,
    username: data.username,
    email: data.email || '',
    avatarUrl: data.avatarUrl,
    status: 'online', // Placeholder
    stats: {
      rank: 0, // Not in backend yet
      tier: 'Bronze', // Not in backend yet
      wins: data.stats?.gamesWon || 0,
      losses: data.stats?.gamesLost || 0,
      winRate: Math.round((data.derived?.winRate || 0) * 100),
      matchesPlayed: data.stats?.gamesPlayed || 0,
    },
    matchHistory: [] // To be implemented
  };
};

export const updateUserProfile = async (username: string, avatar?: File): Promise<Partial<UserProfile>> => {
  const body: any = { username };
  
  // Note: For real images, you'd use FormData. For now, we'll keep it simple
  // and prioritize the username persistence fix.
  
  const response = await fetch('/api/users/me', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update profile');
  }

  const updatedUser = await response.json();
  
  return {
    username: updatedUser.username,
    avatarUrl: updatedUser.avatarUrl
  };
};
