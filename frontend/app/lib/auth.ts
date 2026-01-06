export interface User {
  id: string;
  email: string;
  username?: string;
}

export async function fetchCurrentUser(): Promise<User | null> {
  try {
    const res = await fetch('http://localhost:8080/api/users/me', {
      credentials: 'include', // Important: sends httpOnly cookies
      cache: 'no-store',
    });

    if (!res.ok) {
      return null;
    }

    return await res.json();
  } catch (error) {
    console.error('Auth check failed:', error);
    return null;
  }
}

export async function logout(): Promise<void> {
  try {
    // Call backend logout endpoint to clear httpOnly cookie
    await fetch('http://localhost:8080/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
  } catch (error) {
    console.error('Logout failed:', error);
  } finally {
    window.location.href = '/';
  }
}
