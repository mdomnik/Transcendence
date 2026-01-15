"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Dropdown from "../components/DropDown";
import FloatingShapes from "../components/FloatingShapes";
import Toast from "../components/Toast";
import { useAuth } from "../context/AuthContext";
import { getSocket } from "../lib/socket";
import { emitWithAck } from "../lib/socketEmit";

export default function Dashboard() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();

  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [lobbyCode, setLobbyCode] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [checkingLobby, setCheckingLobby] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (authLoading) return;

    const params = new URLSearchParams(window.location.search);

    if (params.get("left")) {
      setCheckingLobby(false);
      router.replace("/dashboard");
      return;
    }

    if (params.get("kicked")) {
      setToast("You were removed from the lobby by the host.");
      setCheckingLobby(false);
      router.replace("/dashboard");
      return;
    }

    if (params.get("banned")) {
      setToast("You were banned from this lobby.");
      setCheckingLobby(false);
      router.replace("/dashboard");
      return;
    }
  }, [authLoading, router]);

  useEffect(() => {
    if (authLoading || !user) return;

    const params = new URLSearchParams(window.location.search);

    // Explicit exit → never restore
    if (
      params.get("left") ||
      params.get("kicked") ||
      params.get("banned")
    ) {
      setCheckingLobby(false);
      return;
    }

    const socket = getSocket();

    const restoreLobby = async () => {
      try {
        if (!socket.connected) {
          await new Promise<void>((resolve) => {
            socket.once("connect", resolve);
            socket.connect();
          });
        }

        await emitWithAck(socket, "lobby:sync");
        router.replace("/lobby");
      } catch {
        setCheckingLobby(false);
      }
    };

    restoreLobby();
  }, [authLoading, user, router]);


  if (authLoading || checkingLobby) {
    return (
      <main className="min-h-screen bg-[#0A192F] flex items-center justify-center">
        <div className="text-[#64FFDA] text-lg animate-pulse">
          Restoring session…
        </div>
      </main>
    );
  }

  if (!user) return null;
  const userName = user.username || "Player";


  const handleLogout = async () => {
    getSocket().disconnect();
    await logout();
    router.replace("/");
  };

  const handleCreateGame = async () => {
    if (isCreating) return;
    setIsCreating(true);

    try {
      const socket = getSocket();
      if (!socket.connected) socket.connect();

      await emitWithAck(socket, "lobby:create");
      router.push("/lobby");
    } catch {
      setToast("Failed to create lobby.");
      setIsCreating(false);
    }
  };

  const handleJoinGame = async () => {
    if (isJoining) return;

    const code = lobbyCode.trim();
    if (!code) {
      setToast("Please enter a lobby code.");
      return;
    }

    setIsJoining(true);

    try {
      const socket = getSocket();
      if (!socket.connected) socket.connect();

      await emitWithAck(socket, "lobby:join", { lobbyCode: code });
      router.push("/lobby");
    } catch (err: any) {
      switch (err?.message) {
        case "INVALID_LOBBY_CODE":
          setToast("Lobby does not exist or has expired.");
          break;
        case "LOBBY_FULL":
          setToast("This lobby is already full.");
          break;
        case "BANNED_FROM_LOBBY":
          setToast("You are banned from this lobby.");
          break;
        default:
          setToast("Failed to join lobby.");
      }
      setIsJoining(false);
    }
  };

  return (
    <main className="relative min-h-screen bg-[#0A192F] overflow-hidden">
      <FloatingShapes />

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

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
                  className="p-6 rounded-2xl bg-[#0A192F] border border-[#64FFDA]/20 cursor-pointer transition-all hover:border-[#64FFDA]/50 hover:shadow-lg active:scale-[0.97]"
                >
                  <div className="text-5xl mb-4">➕</div>
                  <h3 className="text-xl font-bold text-[#CCD6F6] mb-2">
                    Create Game
                  </h3>
                  <p className="text-[#8892B0] text-sm">
                    Host a new match to challenge friends
                  </p>
                </div>

                {/* Join Game */}
                <div className="p-6 rounded-2xl bg-[#0A192F] border border-[#64FFDA]/20 flex flex-col justify-between hover:border-[#64FFDA]/50">
                  <div className="flex items-start justify-between mb-4">
                    <div className="text-5xl">🔍</div>
                    <input
                      type="text"
                      placeholder="Enter lobby code"
                      maxLength={8}
                      className="w-1/2 px-3 py-2 rounded-lg bg-[#112240] border border-[#64FFDA]/20 text-[#CCD6F6]"
                      value={lobbyCode}
                      onChange={(e) => setLobbyCode(e.target.value)}
                    />
                  </div>

                  <div
                    onClick={handleJoinGame}
                    className="cursor-pointer hover:translate-x-1 transition"
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
            <div className="rounded-2xl bg-[#112240] border border-[#64FFDA]/20 p-6">
              <h3 className="text-lg font-bold text-[#64FFDA] mb-4">
                👥 Friends
              </h3>
              <button
                onClick={() => router.push("/friends")}
                className="w-full py-2 bg-[#64FFDA]/10 hover:bg-[#64FFDA]/20 text-[#64FFDA] rounded-lg text-sm"
              >
                Add Friends
              </button>
            </div>

            <div className="rounded-2xl bg-[#112240] border border-[#64FFDA]/20 p-6">
              <h3 className="text-lg font-bold text-[#64FFDA] mb-4">
                🏆 Leaderboard
              </h3>
              <button
                onClick={() => router.push("/leaderboard")}
                className="w-full py-2 bg-[#64FFDA]/10 hover:bg-[#64FFDA]/20 text-[#64FFDA] rounded-lg text-sm"
              >
                View Rankings
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
