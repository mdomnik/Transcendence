"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import FloatingShapes from "../components/FloatingShapes";
import { useAuth } from "../context/AuthContext";
import { getLeaderboard, LeaderboardEntry } from "../lib/leaderboard";
import { getSocket } from "../lib/socket";

export default function LeaderboardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }

  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      getLeaderboard()
        .then(setEntries)
        .catch(console.error)
        .finally(() => setIsFetching(false));
    }

  }, [user]);

  useEffect(() => {
  console.log(
    entries.map(e => ({
      userId: e.userId,
      username: e.username
    }))
  );
}, [entries]);

  if (loading || isFetching) {
    return (
      <main className="relative min-h-screen bg-[#0A192F] flex items-center justify-center">
        <div className="text-[#64FFDA] text-xl animate-pulse">Loading Rankings...</div>
      </main>
    );
  }

  if (!user) return null;


  return (
    <main className="relative min-h-screen bg-[#0A192F] overflow-hidden">
      <FloatingShapes />

      {/* Header */}
      <header className="relative z-20 flex items-center justify-between px-6 py-4 border-b border-[#64FFDA]/20 bg-[#0A192F]/80 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-[#64FFDA] hover:text-[#5EEAD4] transition-colors flex items-center gap-2 group"
          >
            <span className="group-hover:-translate-x-1 transition-transform">←</span> 
            <span className="text-sm font-medium">Dashboard</span>
          </button>
          <h1 className="text-xl font-bold bg-gradient-to-r from-[#64FFDA] to-[#38BDF8] bg-clip-text text-transparent">
            Global Leaderboard
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-4 py-10 max-w-4xl">
        <div className="text-center mb-12">
          <div className="text-6xl mb-4">🏆</div>
          <h2 className="text-4xl font-extrabold text-[#CCD6F6] mb-3">
            Top Players
          </h2>
          <p className="text-[#8892B0] text-lg">
            The best of the best in the Transcendence arena
          </p>
        </div>

        <div className="bg-[#112240]/60 backdrop-blur-xl rounded-2xl border border-[#64FFDA]/10 overflow-hidden shadow-2xl">
          <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-[#64FFDA]/10 text-[#8892B0] text-xs uppercase tracking-widest font-bold">
            <div className="col-span-1 text-center">Rank</div>
            <div className="col-span-5">Player</div>
            <div className="col-span-2 text-center">Wins</div>
            <div className="col-span-2 text-center">Win Rate</div>
            <div className="col-span-2 text-center">Accuracy</div>
          </div>

          <div className="divide-y divide-[#64FFDA]/5">
            {entries.length === 0 ? (
              <div className="py-20 text-center text-[#8892B0]">
                No rankings available yet. Be the first to win!
              </div>
            ) : (
              entries.map((entry, index) => (
                <div 
                  key={entry.userId} 
                  className={`grid grid-cols-12 gap-4 px-6 py-4 items-center transition-colors hover:bg-[#64FFDA]/5 group ${
                    entry.userId === user.userId ? 'bg-[#64FFDA]/5' : ''
                  }`}
                >
                  <div className="col-span-1 flex justify-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      index === 0 ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' :
                      index === 1 ? 'bg-slate-300/20 text-slate-300 border border-slate-300/30' :
                      index === 2 ? 'bg-amber-600/20 text-amber-600 border border-amber-600/30' :
                      'text-[#8892B0]'
                    }`}>
                      {index + 1}
                    </div>
                  </div>

                  <div className="col-span-5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#0A192F] border border-[#64FFDA]/20 overflow-hidden group-hover:border-[#64FFDA]/50 transition-colors">
                      {entry.avatarPath ? (
                        <img src={entry.avatarPath} alt={entry.username} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm font-bold text-[#64FFDA]">
                          {entry.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className={`font-bold transition-colors ${
                        entry.userId === user.userId ? 'text-[#64FFDA]' : 'text-[#CCD6F6] group-hover:text-white'
                      }`}>
                        {entry.username} {entry.userId === user.userId && "(You)"}
                      </div>
                      <div className="text-[10px] text-[#8892B0]">
                        {entry.gamesPlayed} games played
                      </div>
                    </div>
                  </div>

                  <div className="col-span-2 text-center font-mono text-[#64FFDA]">
                    {entry.gamesWon}
                  </div>

                  <div className="col-span-2 text-center font-mono text-[#CCD6F6]">
                    {Math.round(entry.winRate)}%
                  </div>

                  <div className="col-span-2 text-center font-mono text-[#8892B0]">
                    {Math.round(entry.accuracy)}%
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
