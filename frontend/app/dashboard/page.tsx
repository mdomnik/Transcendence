"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Dropdown from "../components/DropDown";
import FloatingShapes from "../components/FloatingShapes";
import { useAuth } from "../context/AuthContext";
import { getSocket } from "../lib/socket";
import { emitWithAck } from "../lib/socketEmit";

export default function Dashboard() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();

  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [lobbyCode, setLobbyCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  /* ───────── Auth & Socket ───────── */

  useEffect(() => {
    if (!authLoading && !user) router.push("/");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!authLoading && user) {
      const socket = getSocket();
      if (!socket.connected) socket.connect();
    }
  }, [authLoading, user]);

  /* ✅ NEW: listen for kick events */
  useEffect(() => {
    if (authLoading || !user) return;

    const socket = getSocket();

    const onKicked = () => {
      setError("You were removed from the lobby by the host.");
    };

    socket.on("lobby:kicked", onKicked);

    return () => {
      socket.off("lobby:kicked", onKicked);
    };
  }, [authLoading, user]);

  /* Sync lobby on refresh */
  useEffect(() => {
    if (authLoading || !user) return;

    const socket = getSocket();

    const syncLobby = async () => {
      try {
        if (!socket.connected) socket.connect();
        await emitWithAck(socket, "lobby:sync");
        router.push("/lobby");
      } catch {
        /* not in lobby */
      }
    };

    syncLobby();
  }, [authLoading, user, router]);

  /* ───────── Actions ───────── */

  const handleLogout = async () => {
    getSocket().disconnect();
    await logout();
    router.push("/");
  };

  const handleCreateGame = async () => {
    if (isCreating) return;
    setIsCreating(true);
    setError(null);

    try {
      const socket = getSocket();
      if (!socket.connected) socket.connect();
      await emitWithAck(socket, "lobby:create");
      router.push("/lobby");
    } catch {
      setError("Failed to create lobby.");
      setIsCreating(false);
    }
  };

  const handleJoinGame = async () => {
    if (isJoining) return;

    const code = lobbyCode.trim();
    if (!code) {
      setError("Please enter a lobby code.");
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      const socket = getSocket();
      if (!socket.connected) socket.connect();
      await emitWithAck(socket, "lobby:join", { lobbyCode: code });
      router.push("/lobby");
    } catch (err: any) {
      switch (err.message) {
        case "INVALID_LOBBY_CODE":
          setError("Invalid or expired lobby code.");
          break;
        case "LOBBY_FULL":
          setError("This lobby is already full.");
          break;
        case "UNABLE_TO_JOIN_LOBBY":
          setError("Unable to join this lobby.");
          break;
        default:
          setError("Failed to join lobby.");
      }
      setIsJoining(false);
    }
  };

  if (authLoading) {
    return (
      <main className="min-h-screen bg-[#0A192F] flex items-center justify-center">
        <div className="text-[#64FFDA] text-xl">Loading...</div>
      </main>
    );
  }

  if (!user) return null;
  const userName = user.username || "Player";

  return (
    <main className="relative min-h-screen bg-[#0A192F] overflow-hidden">
      <FloatingShapes />

      {/* Header */}
      <header className="relative z-50 flex items-center justify-between px-6 py-4 border-b border-[#64FFDA]/20">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-[#64FFDA] to-[#38BDF8] bg-clip-text text-transparent">
          AI Quiz Master
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-[#CCD6F6]">Welcome, {userName}!</span>
          <Dropdown
            trigger={
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#64FFDA] to-[#5EEAD4] flex items-center justify-center text-[#0A192F] font-bold cursor-pointer">
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

      {/* Main */}
      <div className="relative z-30 px-6 py-16">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Game Cards */}
          <div className="lg:col-span-2">
            <div className="rounded-3xl bg-[#112240] border border-[#64FFDA]/30 p-10 space-y-8">

              {/* Error message (unchanged location) */}
              {error && (
                <p className="text-sm text-red-400 text-center">
                  {error}
                </p>
              )}

              <div className="text-center space-y-3">
                <h2 className="text-4xl font-extrabold text-[#CCD6F6]">
                  Ready to Play?
                </h2>
                <p className="text-[#8892B0]">
                  Challenge your knowledge with AI-generated quizzes!
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Create Game */}
                <div
                  onClick={handleCreateGame}
                  className="p-6 rounded-2xl bg-[#0A192F] border border-[#64FFDA]/20 cursor-pointer select-none transition-all duration-150 hover:border-[#64FFDA]/50 hover:shadow-lg active:scale-[0.97] active:shadow-inner"
                >
                  <div className="text-5xl mb-4">➕</div>
                  <h3 className="text-xl font-bold text-[#CCD6F6] mb-2">
                    Create Game
                  </h3>
                  <p className="text-[#8892B0] text-sm">
                    Host a new match to challenge friends
                  </p>
                  <p className="mt-2 text-xs text-[#64FFDA]/80">
                    Supports 2–24 players
                  </p>
                </div>

                {/* Join Game */}
                <div className="p-6 rounded-2xl bg-[#0A192F] border border-[#64FFDA]/20 flex flex-col justify-between transition-all duration-150 hover:border-[#64FFDA]/50 hover:shadow-lg">
                  <div className="flex items-start justify-between mb-4">
                    <div className="text-5xl">🔍</div>
                    <input
                      type="text"
                      placeholder="Enter lobby code"
                      maxLength={36}
                      className="w-1/2 px-3 py-2 rounded-lg bg-[#112240] border border-[#64FFDA]/20 text-[#CCD6F6] outline-none text-sm"
                      value={lobbyCode}
                      onChange={(e) => {
                        setLobbyCode(e.target.value);
                        if (error) setError(null);
                      }}
                    />
                  </div>

                  <div
                    onClick={handleJoinGame}
                    className="cursor-pointer select-none transition-all duration-150 hover:translate-x-1 active:scale-[0.97]"
                  >
                    <h3 className="text-xl font-bold text-[#CCD6F6] mb-2">
                      Join Game
                    </h3>
                    <p className="text-[#8892B0] text-sm">
                      Find a match or enter a game code
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">

            {/* Friends */}
            <div className="rounded-2xl bg-[#112240] border border-[#64FFDA]/20 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[#64FFDA] flex items-center gap-2">
                  <span>👥</span> Friends
                </h3>
                <button
                  onClick={() => router.push("/friends")}
                  className="text-xs text-[#64FFDA] hover:text-[#5EEAD4]"
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
                  className="w-full py-2 bg-[#64FFDA]/10 hover:bg-[#64FFDA]/20 text-[#64FFDA] rounded-lg text-sm font-medium"
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
                  className="text-xs text-[#64FFDA] hover:text-[#5EEAD4]"
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
                  className="w-full py-2 bg-[#64FFDA]/10 hover:bg-[#64FFDA]/20 text-[#64FFDA] rounded-lg text-sm font-medium"
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
