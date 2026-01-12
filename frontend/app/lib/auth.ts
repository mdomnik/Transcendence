// src/lib/auth.ts
export interface User {
  id: string;
  email: string;
  username?: string;
}

export async function fetchCurrentUser(): Promise<User | null> {
  try {
    const res = await fetch('/api/users/me', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    });

    if (!res.ok) return null;
    return (await res.json()) as User;
  } catch {
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

