"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";

export default function AuthCallback() {
  const router = useRouter();
  const { refreshUser } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      // Wait a moment for cookie to be set
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Refresh user data to fetch the authenticated user
      await refreshUser();
      
      // Redirect to dashboard
      router.push("/dashboard");
    };

    handleCallback();
  }, [refreshUser, router]);

  return (
    <main className="relative min-h-screen bg-[#0A192F] flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="text-[#64FFDA] text-xl animate-pulse">
          Completing sign in...
        </div>
        <div className="w-16 h-16 border-4 border-[#64FFDA] border-t-transparent rounded-full animate-spin mx-auto"></div>
      </div>
    </main>
  );
}
