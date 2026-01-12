export interface User {
  id: string;
  email: string;
  username?: string;
}

export async function fetchCurrentUser(): Promise<User | null> {
  try {
    console.log('Fetching current user...');
    const res = await fetch('http://localhost/api/users/me', {
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
  try {
    // Call backend logout endpoint to clear httpOnly cookie
    await fetch('http://localhost/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
  } catch (error) {
    console.error('Logout failed:', error);
  } finally {
    window.location.href = '/';
  }
}
