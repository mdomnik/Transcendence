// src/context/AuthContext.tsx
'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { User } from '../lib/auth';
import { fetchCurrentUser, logout as apiLogout } from '../lib/auth';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    const me = await fetchCurrentUser();
    setUser(me);
    setLoading(false);
  };

  const logout = async () => {
    setLoading(true);
    try {
      await apiLogout();
    } finally {
      setUser(null);
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const value = useMemo(() => ({ user, loading, refresh, logout }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
