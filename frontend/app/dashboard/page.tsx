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
    await logout();
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

  const userName = user.username || user.email?.split('@')[0] || "Player";

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
              { label: "Profile", onClick: () => router.push("/profile") },
              { label: "Friends", onClick: () => router.push("/friends") },
              { label: "Settings", onClick: () => router.push("/settings") },
              { label: "Logout", onClick: handleLogout },
            ]}
          />
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 px-6 py-16">
        <div className="max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Main Game Section */}
          <div className="lg:col-span-2">
            {/* Welcome Card */}
            <div className="rounded-3xl bg-[#112240] backdrop-blur-xl shadow-2xl border border-[#64FFDA]/30 p-10 space-y-8">
          
          <div className="text-center space-y-4">
            <h2 className="text-4xl md:text-5xl font-extrabold text-[#CCD6F6]">
              Ready to Play?
            </h2>
            <p className="text-lg text-[#8892B0]">
              Challenge your knowledge with AI-generated quizzes!
            </p>
          </div>

          {/* Game Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Create Game */}
            <div 
              onClick={() => router.push("/lobby")}
              className="p-6 rounded-2xl bg-[#0A192F] border border-[#64FFDA]/20 hover:border-[#64FFDA]/50 transition-all hover:scale-105 cursor-pointer">
              <div className="text-5xl mb-4">➕</div>
              <h3 className="text-xl font-bold text-[#CCD6F6] mb-2">Create Game</h3>
              <p className="text-[#8892B0] text-sm">Host a new match to challenge friends</p>
            </div>

            {/* Join Game */}
            <div 
              onClick={() => router.push("/lobby")}
              className="p-6 rounded-2xl bg-[#0A192F] border border-[#64FFDA]/20 hover:border-[#64FFDA]/50 transition-all hover:scale-105 cursor-pointer">
              <div className="text-5xl mb-4">🔍</div>
              <h3 className="text-xl font-bold text-[#CCD6F6] mb-2">Join Game</h3>
              <p className="text-[#8892B0] text-sm">Find a match or enter a game code</p>
            </div>

          </div>

          {/* Play Button */}
          <div className="flex justify-center pt-4">
            <Button 
              variant="Play"
              onClick={() => router.push("/lobby")}
            >
              Start New Game
            </Button>
          </div>

            </div>
          </div>

          {/* Friends Widget Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Quick Friends Access */}
            <div className="rounded-2xl bg-[#112240] border border-[#64FFDA]/20 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[#64FFDA] flex items-center gap-2">
                  <span>👥</span> Friends
                </h3>
                <button
                  onClick={() => router.push("/friends")}
                  className="text-xs text-[#64FFDA] hover:text-[#5EEAD4] transition-colors"
                >
                  View All →
                </button>
              </div>
              
              <div className="space-y-3">
                <p className="text-sm text-[#8892B0] text-center py-8">
                  Connect with friends to challenge them!
                </p>
                <button
                  onClick={() => router.push("/friends")}
                  className="w-full py-2 bg-[#64FFDA]/10 hover:bg-[#64FFDA]/20 text-[#64FFDA] rounded-lg transition-colors text-sm font-medium"
                >
                  Add Friends
                </button>
              </div>
            </div>

            {/* Leaderboard */}
            <div className="rounded-2xl bg-[#112240] border border-[#64FFDA]/20 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[#64FFDA] flex items-center gap-2">
                  <span>🏆</span> Leaderboard
                </h3>
                <button
                  onClick={() => router.push("/leaderboard")}
                  className="text-xs text-[#64FFDA] hover:text-[#5EEAD4] transition-colors"
                >
                  View All →
                </button>
              </div>
              
              <div className="space-y-3">
                <p className="text-sm text-[#8892B0] text-center py-8">
                  Compete and see where you rank!
                </p>
                <button
                  onClick={() => router.push("/leaderboard")}
                  className="w-full py-2 bg-[#64FFDA]/10 hover:bg-[#64FFDA]/20 text-[#64FFDA] rounded-lg transition-colors text-sm font-medium"
                >
                  View Rankings
                </button>
              </div>
            </div>

          </div>

        </div>
      </div>
    </main>
  );
}
