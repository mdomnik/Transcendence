"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import FloatingShapes from "../components/FloatingShapes";
import { useAuth } from "../context/AuthContext";
import { getUserProfile, updateUsername, uploadAvatar, UserProfile } from "../lib/profile";
import EditProfileModal from "../components/EditProfileModal";

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading, refresh: refreshAuth } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    // If auth is done and no user, go home
    if (!authLoading && !user) {
      router.push("/");
      return;
    }

    // In a real app, we might fetch profiling based on ID from URL or just current user
    const fetchProfile = async () => {
      try {
        const data = await getUserProfile();
        setProfile(data);
      } catch (error) {
        console.error("Failed to fetch profile", error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchProfile();
    }
  }, [user, authLoading, router]);

  const handleSaveProfile = async (newUsername: string, newAvatar?: File) => {
    if (!profile) return;
  
    try {
      const updatedFields = await updateUsername(newUsername);
  
      let avatarUpdate: any = null;
      if (newAvatar) {
        avatarUpdate = await uploadAvatar(newAvatar);
      }
  
      // Choose the best available avatarPath, but never wipe it out unintentionally
      const nextAvatarPath =
        avatarUpdate?.avatarPath ??
        updatedFields?.avatarPath ??
        profile.avatarPath;
  
      setProfile(prev =>
        prev
          ? {
              ...prev,
              username: updatedFields?.username ?? prev.username,
              avatarPath: nextAvatarPath,
            }
          : prev
      );

      // console.log('avatar path set to:', nextAvatarPath);
  
      await refreshAuth();
    } catch (error: any) {
      console.error("Failed to save profile:", error);
      alert(error.message || "Failed to update profile. The username might be taken.");
    }
  };

  if (authLoading || loading) {
    return (
      <main className="relative min-h-screen bg-[#0A192F] flex items-center justify-center">
        <div className="text-[#64FFDA] text-xl animate-pulse">Loading Profile...</div>
      </main>
    );
  }

  if (!profile) return null;

  return (
    <main className="relative min-h-screen bg-[#0A192F] overflow-hidden">
      <FloatingShapes />
      
      {/* Navigation Header */}
      <header className="relative z-20 flex items-center justify-between px-6 py-4 border-b border-[#64FFDA]/20">
        <button 
          onClick={() => router.push("/dashboard")}
          className="text-[#64FFDA] hover:text-[#5EEAD4] transition-colors flex items-center gap-2"
        >
          <span>←</span> Back to Dashboard
        </button>
        <h1 className="text-xl font-bold text-[#CCD6F6]">My Profile</h1>
        <div className="w-24"></div> {/* Spacer for centering */}
      </header>

      <div className="relative z-10 container mx-auto px-6 py-10 max-w-5xl">
        
        {/* Profile Header Card */}
        <div className="mb-10 rounded-3xl bg-[#112240] border border-[#64FFDA]/30 p-8 md:p-10 flex flex-col md:flex-row items-center md:items-start gap-8 backdrop-blur-sm shadow-xl">
          
        {/* Avatar Section */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-br from-[#64FFDA] to-[#38BDF8] p-1 shadow-[0_0_20px_rgba(100,255,218,0.3)]">
            <div className="w-full h-full rounded-full bg-[#0A192F] flex items-center justify-center overflow-hidden">
              {profile.avatarPath ? (
                <img
                  src={`${profile.avatarPath}?v=${Date.now()}`}
                  alt="Avatar"
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-[#0A192F] flex items-center justify-center text-4xl font-bold text-[#64FFDA]">
                  {profile.username.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>
          
          <div
            className={`px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              profile.status === 'online'
                ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                : 'bg-gray-500/20 text-gray-400'
            }`}
          >
            {profile.status}
          </div>
        </div>
        

          {/* User Info & Actions */}
          <div className="flex-1 text-center md:text-left space-y-4">
            <div>
              <h2 className="text-4xl font-bold text-[#CCD6F6]">{profile.username}</h2>
              <p className="text-[#8892B0]">{profile.email}</p>
            </div>
            
            <div className="flex flex-wrap justify-center md:justify-start gap-3">
              <button 
                onClick={() => setIsEditModalOpen(true)}
                className="px-5 py-2 rounded-lg bg-[#64FFDA] text-[#0A192F] font-bold hover:bg-[#5EEAD4] transition-colors"
              >
                Edit Profile
              </button>
            </div>
          </div>

          {/* Rank Badge (Right Side) */}
          <div className="hidden md:flex flex-col items-center justify-center p-4 bg-[#0A192F]/50 rounded-2xl border border-[#64FFDA]/20">
            <span className="text-5xl mb-2">💎</span>
            <span className="text-xl font-bold text-[#CCD6F6]">{profile.stats.tier}</span>
            <span className="text-sm text-[#8892B0]">Rank #{profile.stats.rank}</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Matches Played", value: profile.stats.matchesPlayed, icon: "🎮" },
            { label: "Wins", value: profile.stats.wins, icon: "🏆" },
            { label: "Losses", value: profile.stats.losses, icon: "💀" },
            { label: "Win Rate", value: `${profile.stats.winRate}%`, icon: "📈" },
          ].map((stat, i) => (
            <div key={i} className="bg-[#112240] border border-[#64FFDA]/10 p-5 rounded-2xl hover:border-[#64FFDA]/30 transition-colors">
              <div className="text-2xl mb-2">{stat.icon}</div>
              <div className="text-2xl font-bold text-[#CCD6F6]">{stat.value}</div>
              <div className="text-xs text-[#8892B0] uppercase tracking-wider">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Match History Section */}
        <div className="space-y-6">
          <h3 className="text-2xl font-bold text-[#CCD6F6] flex items-center gap-2">
            <span>📜</span> Game History
          </h3>

          <div className="bg-[#112240] rounded-2xl border border-[#64FFDA]/10 overflow-hidden">
            {profile.matchHistory.length > 0 ? (
              <table className="w-full text-left">
                <thead className="bg-[#0A192F] text-[#8892B0] text-sm uppercase tracking-wider">
                  <tr>
                    <th className="p-4 font-medium">Result</th>
                    <th className="p-4 font-medium">Topic</th>
                    <th className="p-4 font-medium">Score</th>
                    <th className="p-4 font-medium text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#64FFDA]/5">
                  {profile.matchHistory.map((match) => (
                    <tr key={match.id} className="hover:bg-[#64FFDA]/5 transition-colors text-[#CCD6F6]">
                      <td className="p-4">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-bold uppercase ${
                          match.won ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'
                        }`}>
                          {match.won ? 'WIN' : 'LOSS'}
                        </span>
                      </td>
                      <td className="p-4 font-medium">{match.topic}</td>
                      <td className="p-4 font-mono text-[#64FFDA]">{match.score}</td>
                      <td className="p-4 text-[#8892B0] text-sm text-right">
                        {new Date(match.playedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-[#8892B0]">
                No matches played yet.
              </div>
            )}
          </div>
        </div>

      </div>

      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        currentUsername={profile.username}
        onSave={handleSaveProfile}
      />
    </main>
  );
}
