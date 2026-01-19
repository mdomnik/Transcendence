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
  avatarPath?: string; // Optional URL for image
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
    avatarPath: data.avatarPath,
    status: data.status || 'offline',
    stats: {
      rank: 0, // Not in backend yet
      tier: 'Bronze', // Not in backend yet
      wins: data.stats?.gamesWon || 0,
      losses: data.stats?.gamesLost || 0,
      winRate: Math.round((data.derived?.winRate || 0) * 100),
      matchesPlayed: data.stats?.gamesPlayed || 0,
    },
    matchHistory: data.games?.map((g: any) => ({
      id: g.id,
      topic: g.topic?.title || 'Unknown',
      score: g.score,
      won: g.won,
      playedAt: g.playedAt,
    })) || [],
  };
};

export const updateUsername = async (username: string) => {
  const response = await fetch('/api/users/me', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ username }),
  });

  if (!response.ok) {
    let msg = 'Failed to update profile';
    try {
      const err = await response.json();
      msg = err?.message ?? msg;
    } catch {}
    throw new Error(msg);
  }

  // Expect backend to return updated user (via getMe or select)
  return response.json();
};

export const uploadAvatar = async (file: File) => {
  const formData = new FormData();
  formData.append('avatar', file);

  const response = await fetch('/api/users/me/avatar', {
    method: 'PATCH',
    credentials: 'include',
    body: formData,
  });

  if (!response.ok) {
    let msg = 'Failed to upload avatar';
    try {
      const err = await response.json();
      msg = err?.message ?? msg;
    } catch {}
    throw new Error(msg);
  }

  return response.json();
};

export const searchUsers = async (query: string) => {
  const response = await fetch(`/api/users/search?query=${encodeURIComponent(query)}`, {
    credentials: 'include',
  });
  if (!response.ok) return [];
  return response.json();
};

