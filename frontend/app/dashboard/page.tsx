"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Button from "../components/Button";
import Dropdown from "../components/DropDown";
import FloatingShapes from "../components/FloatingShapes";
import { useAuth } from "../context/AuthContext";
import { logout } from "../lib/auth";

export default function Dashboard() {
  const router = useRouter();
  const { user, loading } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    await logout(); // Now properly clears cookies and calls backend
  };

  // Show loading state while checking auth
  if (loading) {
    return (
      <main className="relative min-h-screen bg-[#0A192F] flex items-center justify-center">
        <div className="text-[#64FFDA] text-xl">Loading...</div>
      </main>
    );
  }

  // Don't show dashboard if not authenticated (will redirect)
  if (!user) {
    return null;
  }

  const userName = user.email?.split('@')[0] || "Player";

  return (
    <main className="relative min-h-screen bg-[#0A192F] overflow-hidden">
      {/* Floating Animations */}
      <FloatingShapes />

      {/* Header */}
      <header className="relative z-20 flex items-center justify-between px-6 py-4 border-b border-[#64FFDA]/20">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-[#64FFDA] to-[#38BDF8] bg-clip-text text-transparent">
          AI Quiz Master
        </h1>

        <div className="flex items-center gap-4">
          <span className="text-[#CCD6F6]">Welcome, {userName}!</span>
          
          <Dropdown
            trigger={
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#64FFDA] to-[#5EEAD4] flex items-center justify-center text-[#0A192F] font-bold cursor-pointer hover:scale-105 transition-transform">
                {userName.charAt(0).toUpperCase()}
              </div>
            }
            userName={userName}
            userEmail={user.email || ""}
            items={[
              { label: "Profile", onClick: () => window.location.href = "/profile" },
              { label: "Settings", onClick: () => window.location.href = "/settings" },
              { label: "Logout", onClick: handleLogout },
            ]}
          />
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center px-6 py-12">
        
        {/* Welcome Card */}
        <div className="max-w-4xl w-full rounded-3xl bg-[#112240] backdrop-blur-xl shadow-2xl border border-[#64FFDA]/30 p-10 space-y-8">
          
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-extrabold text-[#CCD6F6]">
              Ready to Play?
            </h2>
            <p className="text-lg text-[#8892B0]">
              Challenge your knowledge with AI-generated quizzes!
            </p>
          </div>

          {/* Game Options */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Quick Play */}
            <div className="p-6 rounded-2xl bg-[#0A192F] border border-[#64FFDA]/20 hover:border-[#64FFDA]/50 transition-all hover:scale-105 cursor-pointer">
              <div className="text-4xl mb-4">🎮</div>
              <h3 className="text-xl font-bold text-[#CCD6F6] mb-2">Quick Play</h3>
              <p className="text-[#8892B0] text-sm">Jump into a random quiz instantly</p>
            </div>

            {/* Multiplayer */}
            <div className="p-6 rounded-2xl bg-[#0A192F] border border-[#64FFDA]/20 hover:border-[#64FFDA]/50 transition-all hover:scale-105 cursor-pointer">
              <div className="text-4xl mb-4">👥</div>
              <h3 className="text-xl font-bold text-[#CCD6F6] mb-2">Multiplayer</h3>
              <p className="text-[#8892B0] text-sm">Challenge friends in real-time</p>
            </div>

            {/* Leaderboard */}
            <div className="p-6 rounded-2xl bg-[#0A192F] border border-[#64FFDA]/20 hover:border-[#64FFDA]/50 transition-all hover:scale-105 cursor-pointer">
              <div className="text-4xl mb-4">🏆</div>
              <h3 className="text-xl font-bold text-[#CCD6F6] mb-2">Leaderboard</h3>
              <p className="text-[#8892B0] text-sm">See top players worldwide</p>
            </div>

          </div>

          {/* Play Button */}
          <div className="flex justify-center pt-4">
            <Button variant="Play">
              Start New Game
            </Button>
          </div>

        </div>

        {/* Stats Section */}
        <div className="max-w-4xl w-full mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-[#112240] border border-[#64FFDA]/20 text-center">
            <div className="text-3xl font-bold text-[#64FFDA]">0</div>
            <div className="text-sm text-[#8892B0]">Games Played</div>
          </div>
          <div className="p-4 rounded-xl bg-[#112240] border border-[#64FFDA]/20 text-center">
            <div className="text-3xl font-bold text-[#64FFDA]">0%</div>
            <div className="text-sm text-[#8892B0]">Win Rate</div>
          </div>
          <div className="p-4 rounded-xl bg-[#112240] border border-[#64FFDA]/20 text-center">
            <div className="text-3xl font-bold text-[#64FFDA]">0</div>
            <div className="text-sm text-[#8892B0]">Total Points</div>
          </div>
          <div className="p-4 rounded-xl bg-[#112240] border border-[#64FFDA]/20 text-center">
            <div className="text-3xl font-bold text-[#64FFDA]">#-</div>
            <div className="text-sm text-[#8892B0]">Global Rank</div>
          </div>
        </div>

      </div>
    </main>
  );
}
