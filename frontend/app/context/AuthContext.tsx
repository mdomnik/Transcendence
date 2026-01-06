"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, fetchCurrentUser, hasAuthCookie } from "../lib/auth";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    setLoading(true);
    
    // Quick check for cookie existence before making API call
    if (!hasAuthCookie()) {
      setUser(null);
      setLoading(false);
      return;
    }

    const currentUser = await fetchCurrentUser();
    setUser(currentUser);
    setLoading(false);
  };

  useEffect(() => {
    refreshUser();

    // Listen for cookie changes (e.g., from other tabs)
    const handleStorageChange = () => {
      refreshUser();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
