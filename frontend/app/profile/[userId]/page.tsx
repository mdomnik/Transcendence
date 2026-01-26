"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import FloatingShapes from "../../components/FloatingShapes";
import { useAuth } from "../../context/AuthContext";
import { getUserProfile, UserProfile } from "../../lib/profile";
import { getFriends, sendFriendRequest, FriendStatus } from "../../lib/friends";
import { getSocket } from "../../lib/socket";

interface UserProfilePageProps {
  params: Promise<{ userId: string }>;
}

export default function UserProfilePage({ params }: UserProfilePageProps) {
  const { userId } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [friendState, setFriendState] = useState<'loading' | 'none' | 'requested' | 'pending' | 'friends'>('loading');
  const [requesting, setRequesting] = useState(false);

  const isSelf = useMemo(() => user?.id === userId, [user?.id, userId]);

  const fetchFriendState = useCallback(async () => {
    try {
      const friendships = await getFriends();
      const match = friendships.find((f) => f.friend.id === userId);
      if (!match) {
        setFriendState('none');
        return;
      }
      if (match.status === FriendStatus.ACCEPTED) {
        setFriendState('friends');
        return;
      }
      if (match.status === FriendStatus.PENDING) {
        setFriendState(match.requesterId === user?.id ? 'requested' : 'pending');
        return;
      }
      setFriendState('none');
    } catch (_err) {
      setFriendState('none');
    }
  }, [userId, user?.id]);

  useEffect(() => {
    if (authLoading) return;

    if (!authLoading && !user) {
      router.push("/");
      return;
    }

    if (isSelf) {
      router.replace("/profile");
      return;
    }

    const fetchProfile = async () => {
      try {
        const data = await getUserProfile(userId);
        setProfile(data);
      } catch (err: any) {
        setError(err?.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
    fetchFriendState();

    const socket = getSocket();
    const handleFriendshipUpdate = () => fetchFriendState();
    socket.on("friendship:updated", handleFriendshipUpdate);

    return () => {
      socket.off("friendship:updated", handleFriendshipUpdate);
    };
  }, [authLoading, user, userId, router, isSelf, fetchFriendState]);

  const goBack = () => router.push("/dashboard");

  const handleAddFriend = async () => {
    if (requesting || friendState === 'friends' || friendState === 'requested') return;
    setRequesting(true);
    const result = await sendFriendRequest(userId);
    if (!result.ok) {
      alert(result.error || 'Failed to send friend request');
    } else {
      setFriendState('requested');
    }
    setRequesting(false);
  };

  if (authLoading || loading) {
    return (
      <main className="relative min-h-screen bg-[#0A192F] flex items-center justify-center">
        <div className="text-[#64FFDA] text-xl animate-pulse">Loading Profile...</div>
      </main>
    );
  }

  if (error || !profile) {
    return (
      <main className="relative min-h-screen bg-[#0A192F] flex flex-col items-center justify-center gap-4 text-center px-6">
        <div className="text-5xl">🛰️</div>
        <p className="text-[#CCD6F6] text-lg">{error || "Profile not available."}</p>
        <button
          onClick={goBack}
          className="px-4 py-2 rounded-lg bg-[#64FFDA] text-[#0A192F] font-semibold hover:bg-[#5EEAD4] transition-colors"
        >
          Back to Dashboard
        </button>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen bg-[#0A192F] overflow-hidden">
      <FloatingShapes />

      {/* Navigation Header */}
      <header className="relative z-20 flex items-center justify-between px-6 py-4 border-b border-[#64FFDA]/20">
        <button
          onClick={goBack}
          className="text-[#64FFDA] hover:text-[#5EEAD4] transition-colors flex items-center gap-2"
        >
          <span>←</span> Back to Dashboard
        </button>
        <h1 className="text-xl font-bold text-[#CCD6F6]">Player Profile</h1>
        <div className="w-24" />
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
                    alt={`${profile.username}'s avatar`}
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
                profile.status === "online"
                  ? "bg-green-500/20 text-green-400 border border-green-500/50"
                  : profile.status === "in-game"
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/50"
                  : "bg-gray-500/20 text-gray-400"
              }`}
            >
              {profile.status}
            </div>
          </div>

          {/* User Info */}
          <div className="flex-1 text-center md:text-left space-y-4">
            <div>
              <h2 className="text-4xl font-bold text-[#CCD6F6]">{profile.username}</h2>
              <p className="text-[#8892B0]">{profile.email || "Email hidden"}</p>
            </div>
            <div className="flex flex-wrap justify-center md:justify-start gap-3">
              {friendState === 'loading' && (
                <button
                  className="px-5 py-2 rounded-lg bg-[#112240] text-[#8892B0] font-bold cursor-default"
                  disabled
                >
                  Checking...
                </button>
              )}
              {friendState === 'friends' && (
                <button
                  className="px-5 py-2 rounded-lg bg-green-500 text-[#0A192F] font-bold cursor-default"
                  disabled
                >
                  Friends
                </button>
              )}
              {friendState === 'requested' && (
                <button
                  className="px-5 py-2 rounded-lg bg-amber-400 text-[#0A192F] font-bold cursor-default"
                  disabled
                >
                  Request sent
                </button>
              )}
              {friendState === 'pending' && (
                <button
                  className="px-5 py-2 rounded-lg bg-blue-400 text-[#0A192F] font-bold cursor-default"
                  disabled
                >
                  Pending approval
                </button>
              )}
              {friendState !== 'friends' && friendState !== 'requested' && friendState !== 'pending' && (
                <button
                  onClick={handleAddFriend}
                  disabled={requesting}
                  className="px-5 py-2 rounded-lg bg-[#64FFDA] text-[#0A192F] font-bold hover:bg-[#5EEAD4] transition-colors disabled:opacity-60"
                >
                  {requesting ? 'Sending...' : 'Add Friend'}
                </button>
              )}
            </div>
          </div>

          {/* Rank Badge */}
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
                    <th className="p-4 font-medium">Score</th>
                    <th className="p-4 font-medium text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#64FFDA]/5">
                  {profile.matchHistory.map((match) => (
                    <tr key={match.id} className="hover:bg-[#64FFDA]/5 transition-colors text-[#CCD6F6]">
                      <td className="p-4">
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-bold uppercase ${
                            match.won ? "text-green-400 bg-green-400/10" : "text-red-400 bg-red-400/10"
                          }`}
                        >
                          {match.won ? "WIN" : "LOSS"}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-[#64FFDA]">{match.score}</td>
                      <td className="p-4 text-[#8892B0] text-sm text-right">
                        {new Date(match.playedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-[#8892B0]">No public matches yet.</div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
