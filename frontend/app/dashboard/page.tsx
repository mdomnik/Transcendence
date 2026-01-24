"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import FloatingShapes from "../components/FloatingShapes";
import Toast from "../components/Toast";
import ChatBox from "../components/ChatBox";
import { useAuth } from "../context/AuthContext";
import { getSocket } from "../lib/socket";
import { emitWithAck } from "../lib/socketEmit";
import { getFriends, Friendship } from "../lib/friends";
import { getLeaderboard, LeaderboardEntry } from "../lib/leaderboard";
import Footer from '../components/Footer';

export default function Dashboard() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();

  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [lobbyCode, setLobbyCode] = useState("");
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null);
  const [checkingLobby, setCheckingLobby] = useState(true);
  const [activeLobby, setActiveLobby] = useState<any>(null);
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [leaderboardPreview, setLeaderboardPreview] = useState<LeaderboardEntry[]>([]);

  const showToast = (message: string, type: 'error' | 'success' | 'info' = 'error') => {
    setToast({ message, type });
  };

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
      showToast("You were removed from the lobby by the host.");
      setCheckingLobby(false);
      router.replace("/dashboard");
      return;
    }

    if (params.get("banned")) {
      showToast("You were banned from this lobby.");
      setCheckingLobby(false);
      router.replace("/dashboard");
      return;
    }
  }, [authLoading, router]);

  useEffect(() => {
    if (authLoading || !user) return;

    const params = new URLSearchParams(window.location.search);

    // Explicit exit or manual return → never restore
    if (
      params.get("left") ||
      params.get("kicked") ||
      params.get("banned") ||
      params.get("fromLobby")
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

        const res = await emitWithAck(socket, "lobby:sync");
        if (!res.ok) {
          setCheckingLobby(false);
          return;
        }

        const lobby = res.data;
        console.log("lobby state in dashboard:", lobby);
        setActiveLobby(lobby);
        setCheckingLobby(false);
      } catch (err) {
        console.warn("Emit failed:", err);
        setCheckingLobby(false);
      }
    };

    restoreLobby();
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    const socket = getSocket();

    const fetchFriends = () => getFriends().then(setFriends).catch(console.error);

    fetchFriends();
    getLeaderboard().then(data => setLeaderboardPreview(data.slice(0, 3))).catch(console.error);

    // Listen for real-time presence/status updates
    socket.on("presence:updated", fetchFriends);
    
    const handleFriendshipUpdate = (data: any) => {
      fetchFriends();
      if (data.type === 'REQUEST_RECEIVED') {
        showToast(`Friend request from ${data.fromUsername || "someone"}`, 'info');
      }
      if (data.type === 'ACCEPTED') {
        showToast(`You are now friends with ${data.fromUsername || "someone"}!`, 'success');
      }
    };

    const handleNewMessage = (msg: any) => {
      // We only show toast if the sender is not us
      if (msg.senderId !== user.id) {
        showToast(`New message from ${msg.sender.username}`, 'info');
      }
    };

    socket.on("friendship:updated", handleFriendshipUpdate);
    socket.on("chat:receive", handleNewMessage);

    return () => {
      socket.off("presence:updated", fetchFriends);
      socket.off("friendship:updated", handleFriendshipUpdate);
      socket.off("chat:receive", handleNewMessage);
    };
  }, [user]);

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

    if (activeLobby) {
      router.push(activeLobby.state === "IN_GAME" ? "/game" : "/lobby");
      return;
    }

    setIsCreating(true);

    try {
      const socket = getSocket();
      if (!socket.connected) socket.connect();

      const res = await emitWithAck(socket, "lobby:create");
      if (!res.ok) {
        if (res.error === "User is already in a lobby") {
          showToast("You are already in an active lobby. Re-syncing...", "info");
          // Trigger a re-sync
          const syncRes = await emitWithAck(socket, "lobby:sync");
          if (syncRes.ok) setActiveLobby(syncRes.data);
        } else {
          showToast(`Error: ${res.error}`);
        }
        setIsCreating(false);
        return;
      }
      router.push("/lobby");
    } catch (err) {
      showToast("Failed to connect to game server.");
      setIsCreating(false);
    }
  };

  const handleLeaveCurrentLobby = async () => {
    if (!activeLobby) return;
    try {
      await emitWithAck(getSocket(), "lobby:leave", {
        lobbyId: activeLobby.lobbyId,
      });
      setActiveLobby(null);
      showToast("Left the previous lobby.", "info");
    } catch (err) {
      console.error("Failed to leave lobby:", err);
    }
  };

  const handleJoinGame = async () => {
    if (isJoining) return;

    const code = lobbyCode.trim();
    if (!code) {
      showToast("Please enter a lobby code.");
      return;
    }

    setIsJoining(true);

    try {
      const socket = getSocket();
      if (!socket.connected) socket.connect();

      const res = await emitWithAck(socket, "lobby:join", {
        lobbyCode: code,
      });

      if (!res.ok) {
        switch (res.error) {
          case "INVALID_LOBBY_CODE":
            showToast("Lobby does not exist or has expired.");
            break;
          case "LOBBY_FULL":
            showToast("This lobby is already full.");
            break;
          case "BANNED_FROM_LOBBY":
            showToast("You are banned from this lobby.");
            break;
          default:
            showToast(`Error: ${res.error || "Failed to join lobby"}`);
        }
        setIsJoining(false);
        return;
      }

      router.push("/lobby");
    } catch (err: any) {
      showToast("Failed to connect to server.");
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <main className="relative flex-1 overflow-hidden bg-[#0A192F]">
        <FloatingShapes />

        {toast && (
          <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast(null)} 
          />
        )}

        {/* Header */}
        <header className="relative z-50 flex items-center justify-between px-6 py-4 border-b border-[#64FFDA]/20">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[#64FFDA] to-[#38BDF8] bg-clip-text text-transparent">
            QuizEverything
          </h1>

          <div className="flex items-center gap-4">
            <span className="text-[#CCD6F6]">Welcome, {userName}!</span>
            
            {/* Avatar as Profile Button */}
            <button
              onClick={() => router.push("/profile")}
              className="w-10 h-10 rounded-full bg-gradient-to-r from-[#64FFDA] to-[#5EEAD4] flex items-center justify-center text-[#0A192F] font-bold overflow-hidden hover:scale-110 transition-transform cursor-pointer border-2 border-transparent hover:border-[#64FFDA]/50"
            >
              {user.avatarPath ? (
                <img src={`${user.avatarPath}?v=${Date.now()}`} alt={userName} className="w-full h-full object-cover" />
              ) : (
                userName.charAt(0).toUpperCase()
              )}
            </button>

            {/* Just Logout button */}
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 bg-[#64FFDA] text-[#0A192F] rounded hover:bg-[#4ECDC4] transition-colors text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Main */}
        <div className="relative z-30 px-6 py-16">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Game Cards */}
            <div className="lg:col-span-2">
              <div className="rounded-3xl bg-[#112240] border border-[#64FFDA]/30 p-10 space-y-8 relative overflow-hidden">
                {activeLobby && (
                  <div className="absolute top-0 left-0 w-full bg-[#64FFDA] py-1.5 text-[#0A192F] text-center text-xs font-bold uppercase tracking-widest animate-pulse">
                    Active Session Detected
                  </div>
                )}

                <div className="text-center space-y-3">
                  <h2 className="text-4xl font-extrabold text-[#CCD6F6]">
                    {activeLobby ? "Welcome Back!" : "Ready to Play?"}
                  </h2>
                  <p className="text-[#8892B0]">
                    {activeLobby
                      ? "You have an ongoing session. Resume your game now!"
                      : "Challenge your knowledge with AI-generated quizzes!"}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Create or Resume Game */}
                  <div
                    onClick={handleCreateGame}
                    className={`p-6 rounded-2xl bg-[#0A192F] border ${
                      activeLobby ? "border-[#64FFDA]" : "border-[#64FFDA]/20"
                    } cursor-pointer transition-all hover:border-[#64FFDA]/50 hover:shadow-lg active:scale-[0.97] group`}
                  >
                    <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">
                      {activeLobby ? "🎮" : "➕"}
                    </div>
                    <h3 className="text-xl font-bold text-[#CCD6F6] mb-2">
                      {activeLobby ? "Resume Game" : "Create Game"}
                    </h3>
                    <p className="text-[#8892B0] text-sm">
                      {activeLobby
                        ? "Go back to your active match or lobby"
                        : "Host a new match to challenge friends"}
                    </p>
                  </div>

                  {/* Join Game or Leave Status */}
                  {!activeLobby ? (
                    <div className="p-6 rounded-2xl bg-[#0A192F] border border-[#64FFDA]/20 flex flex-col justify-between hover:border-[#64FFDA]/50">
                      <div className="flex items-start justify-between mb-4">
                        <div className="text-5xl">🔍</div>
                        <input
                          type="text"
                          placeholder="Code"
                          maxLength={8}
                          className="w-1/2 px-3 py-2 rounded-lg bg-[#112240] border border-[#64FFDA]/20 text-[#CCD6F6] focus:border-[#64FFDA] outline-none transition-colors"
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
                          Find a match by entering a game code
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={handleLeaveCurrentLobby}
                      className="p-6 rounded-2xl bg-[#0A192F] border border-red-500/20 flex flex-col justify-center hover:border-red-500/50 cursor-pointer group transition-all"
                    >
                      <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">
                        🚪
                      </div>
                      <h3 className="text-xl font-bold text-red-400 mb-2">
                        Leave Current
                      </h3>
                      <p className="text-[#8892B0] text-sm">
                        Quit your current session to start a new one
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              <div className="rounded-2xl bg-[#112240] border border-[#64FFDA]/20 p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[15px] font-bold text-[#64FFDA]">
                    👥 Friends
                  </h3>
                </div>
                
                <div className="space-y-1.5 mb-3 max-h-[200px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-[#64FFDA]/10 scrollbar-track-transparent">
                  {friends.length === 0 ? (
                    <p className="text-[12px] text-[#8892B0] text-center py-4">No friends</p>
                  ) : (
                    friends
                      .sort((a, b) => {
                        const priority = { 'in-game': 1, 'online': 2, 'offline': 3 };
                        const statusA = (a.friend.status as any) || 'offline';
                        const statusB = (b.friend.status as any) || 'offline';
                        return (priority[statusA as keyof typeof priority] || 99) - (priority[statusB as keyof typeof priority] || 99);
                      })
                      .map((friendship) => (
                        <div key={friendship.id} className="flex items-center justify-between group">
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <div className="w-7 h-7 rounded-full bg-[#0A192F] border border-[#64FFDA]/10 overflow-hidden">
                                {friendship.friend.avatarPath ? (
                                  <img src={friendship.friend.avatarPath} alt={friendship.friend.username} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[11px] font-bold text-[#64FFDA]">
                                    {friendship.friend.username.charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#112240] ${
                                friendship.friend.status === 'online' ? 'bg-green-500' : 
                                friendship.friend.status === 'in-game' ? 'bg-blue-500' : 'bg-gray-500'
                              }`} />
                            </div>
                            <span className="text-[13px] text-[#CCD6F6] group-hover:text-[#64FFDA] transition-colors truncate max-w-[90px]">
                              {friendship.friend.username}
                            </span>
                          </div>
                          <span className={`text-[10px] uppercase font-bold ${
                            friendship.friend.status === 'in-game' ? 'text-blue-400' :
                            friendship.friend.status === 'online' ? 'text-green-400' : 'text-[#8892B0]'
                          }`}>
                            {friendship.friend.status === 'in-game' ? 'Game' : friendship.friend.status || 'offline'}
                          </span>
                        </div>
                      ))
                  )}
                </div>

                <button
                  onClick={() => router.push("/friends")}
                  className="w-full py-1.5 bg-[#64FFDA]/5 hover:bg-[#64FFDA]/15 text-[#64FFDA] rounded-lg text-[13px] transition-colors border border-[#64FFDA]/10"
                >
                  Manage
                </button>
              </div>

              <div className="rounded-2xl bg-[#112240] border border-[#64FFDA]/20 p-3.5 flex flex-col">
                <div className="flex items-center justify-between mb-2.5 px-0.5">
                  <h3 className="text-[15px] font-bold text-[#64FFDA] flex items-center gap-2">
                    🏆 Rankings
                  </h3>
                </div>
                
                <div className="space-y-1.5 mb-3 flex-1">
                  {leaderboardPreview.length === 0 ? (
                    <p className="text-[12px] text-[#8892B0] text-center py-2">Loading...</p>
                  ) : (
                    <>
                      {leaderboardPreview.map((entry, idx) => (
                        <div key={entry.userId ?? `leaderboard-${idx}`} className={`flex items-center justify-between group p-1.5 rounded-lg transition-colors ${
                          entry.userId === user.id ? 'bg-[#64FFDA]/5 border border-[#64FFDA]/20' : 'hover:bg-[#64FFDA]/5'
                        }`}>
                          <div className="flex items-center gap-2">
                            <div className={`text-[11px] font-bold w-4 h-4 rounded-full flex items-center justify-center ${
                              idx === 0 ? 'bg-yellow-500/20 text-yellow-500' : 
                              idx === 1 ? 'bg-slate-300/20 text-slate-300' : 
                              'bg-amber-600/20 text-amber-600'
                            }`}>
                              {idx + 1}
                            </div>
                            <div className="w-6 h-6 rounded-full bg-[#0A192F] border border-[#64FFDA]/10 overflow-hidden">
                              {entry.avatarPath ? (
                                <img src={entry.avatarPath} alt={entry.username} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-[#64FFDA]">
                                  {entry.username.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span className={`text-[13px] font-bold truncate max-w-[70px] ${
                                entry.userId === user.id ? 'text-[#64FFDA]' : 'text-[#CCD6F6]'
                              }`}>
                                {entry.username}
                              </span>
                            </div>
                          </div>
                          <div className="text-right pr-1">
                            <div className="text-[12px] font-mono text-[#64FFDA] font-bold">
                              {entry.gamesWon}W
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {!leaderboardPreview.find(e => e.userId === user.id) && (
                        <div className="mt-1 pt-1 border-t border-[#64FFDA]/5 text-center">
                          <button 
                            onClick={() => router.push("/leaderboard")}
                            className="text-[11px] text-[#8892B0] hover:text-[#64FFDA] transition-colors"
                          >
                            You: #{Math.floor(Math.random() * 50) + 10} • Stats →
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <button
                  onClick={() => router.push("/leaderboard")}
                  className="w-full py-1.5 bg-[#64FFDA]/5 hover:bg-[#64FFDA]/15 text-[#64FFDA] rounded-lg text-[13px] transition-all font-medium border border-[#64FFDA]/10"
                >
                  Show All
                </button>
              </div>
            </div>
          </div>
        </div>

        <ChatBox currentUser={{ id: user.id || "", username: user.username || "" }} friends={friends} />
      </main>

      {/* Footer - will push up and be visible */}
      <Footer />
    </div>
  );
}
