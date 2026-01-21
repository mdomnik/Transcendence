// src/lib/auth.ts
export interface User {
  id: string;
  email: string;
  username?: string;
  avatarPath?: string;
}

export async function fetchCurrentUser(): Promise<User | null> {
  try {
    console.log('Fetching current user...');
    const res = await fetch('/api/users/me', {
      method: 'GET',
      credentials: 'include', // Important: sends httpOnly cookies
      cache: 'no-store',
    });

    console.log('Response status:', res.status);
    
    if (!res.ok) {
      console.log('Not authenticated');
      return null;
    }

    const user = await res.json();
    console.log('User authenticated:', user);
    return user;
  } catch (error) {
    console.error('Auth check failed:', error);
    return null;
  }
}

export async function logout(): Promise<void> {
  // Backend must clear the httpOnly cookie
  await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
  });
}

