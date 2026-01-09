export interface User {
  id: string;
  email: string;
  username?: string;
}

// Cookie utilities
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

export function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

export function hasAuthCookie(): boolean {
  return getCookie('access_token') !== null;
}

export async function fetchCurrentUser(): Promise<User | null> {
  // Check if cookie exists first
  if (!hasAuthCookie()) {
    return null;
  }

  try {
    const res = await fetch('https://localhost/api/users/me', {
      credentials: 'include', // Important: sends cookies
      cache: 'no-store',
    });

    if (!res.ok) {
      // If unauthorized, clear the cookie
      if (res.status === 401) {
        deleteCookie('access_token');
      }
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
    await fetch('https://localhost/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
  } catch (error) {
    console.error('Logout failed:', error);
  } finally {
    // Clear any client-side cookies
    deleteCookie('access_token');
    window.location.href = '/';
  }
}
