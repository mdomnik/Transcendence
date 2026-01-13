"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "../components/Button";
import Dropdown from "../components/DropDown";
import FloatingShapes from "../components/FloatingShapes";
import { useAuth } from "../context/AuthContext";
import { getSocket } from "../lib/socket";
import { logout } from "../lib/auth";

export default function Dashboard() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [lobbyCode, setLobbyCode] = useState('');

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!authLoading && user) {
      const socket = getSocket();

      if (!socket.connected) {
        socket.connect();

        socket.on("connect", () => {
          console.log("WebSocket connected:", socket.id);
          socket.emit("dashboard:connect");
        });

        socket.on("disconnect", () => {
          console.log("WebSocket disconnected");
        });

        socket.on("connect_error", (err) => {
          console.error("Socket connect_error:", err.message);
        });
      }
    }
  }, [authLoading, user]);

  const handleLogout = async () => {
    const socket = getSocket();
    socket.disconnect();
    await logout();
    router.push("/");
  };

  const handleJoinGame = (e: React.FormEvent) => {
    e.preventDefault();
    if (isJoining) return;
    if (!lobbyCode.trim()) return;

    const socket = getSocket();
    console.log("Create Game button clicked. Socket connected:", socket.connected);
    setIsJoining(true);

    const emitJoin = () => {
        console.log("Preparing to emit lobby:join...");

        const timeout = setTimeout(() => {
            console.error("lobby:join request timed out after 10s");
            setIsJoining(false);
            alert("Server request timed out. Please try again.")
        }, 10000);

        socket.emit('lobby:join', {lobbyCode: lobbyCode.trim(),}, (response: any) => {
            clearTimeout(timeout);
            console.log("lobby:join response received:", response);
            setIsCreating(false);
            if (response?.ok) {
            console.log('Lobby join successful, redirecting to /lobby');
            router.push('/lobby');
            } else {
            console.error('Failed to join lobby:', response);
            alert(response?.error || 'Failed to join lobby. Please try again.');
            }
        })
    }
    if (!socket.connected) {
      console.log("Socket not connected, calling socket.connect()...");
      
      const onConnect = () => {
        console.log("Socket connect event received in handleJoinGame");
        socket.off("connect_error", onConnectError);
        emitJoin();
      };

      const onConnectError = (error: any) => {
        console.error("Socket connect_error event received in handleJoinGame:", error);
        socket.off("connect", onConnect);
        setIsCreating(false);
        alert("Failed to connect to game server: " + (error.message || "Unknown error"));
      };

      socket.once("connect", onConnect);
      socket.once("connect_error", onConnectError);
      
      socket.connect();
    } else {
      console.log("Socket already connected, emitting immediately");
      emitJoin();
    }
  }

  const handleCreateGame = () => {
    if (isCreating) return;
    
    const socket = getSocket();
    console.log("Create Game button clicked. Socket connected:", socket.connected);
    setIsCreating(true);
    
    const emitCreate = () => {
      console.log("Preparing to emit lobby:create...");
      
      // Set a timeout to clear the creating state if server doesn't respond
      const timeout = setTimeout(() => {
        console.error("lobby:create request timed out after 10s");
        setIsCreating(false);
        alert("Server request timed out. Please try again.");
      }, 10000);

      socket.emit('lobby:create', {}, (response: any) => {
        clearTimeout(timeout);
        console.log("lobby:create response received:", response);
        setIsCreating(false);
        if (response?.ok) {
          console.log('Lobby creation/join successful, redirecting to /lobby');
          router.push('/lobby');
        } else {
          console.error('Failed to create lobby:', response);
          alert(response?.error || 'Failed to create lobby. Please try again.');
        }
      });
    };

    if (!socket.connected) {
      console.log("Socket not connected, calling socket.connect()...");
      
      const onConnect = () => {
        console.log("Socket connect event received in handleCreateGame");
        socket.off("connect_error", onConnectError);
        emitCreate();
      };

      const onConnectError = (error: any) => {
        console.error("Socket connect_error event received in handleCreateGame:", error);
        socket.off("connect", onConnect);
        setIsCreating(false);
        alert("Failed to connect to game server: " + (error.message || "Unknown error"));
      };

      socket.once("connect", onConnect);
      socket.once("connect_error", onConnectError);
      
      socket.connect();
    } else {
      console.log("Socket already connected, emitting immediately");
      emitCreate();
    }
  };

  // Show loading state while checking auth
  if (authLoading) {
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

  const userName = user.username || "Player";

  return (
    <main className="relative min-h-screen bg-[#0A192F] overflow-hidden">
      {/* Floating Animations */}
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
      <div className="relative z-30 px-6 py-16">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-40">
            
            {/* Create Game */}
            <div
              onClick={handleCreateGame}
              className={`p-6 rounded-2xl bg-[#0A192F] border border-[#64FFDA]/20 hover:border-[#64FFDA]/50 transition-all hover:scale-105 cursor-pointer pointer-events-auto ${isCreating ? 'opacity-50 cursor-wait' : ''}`}>
              <div className="text-5xl mb-4">{isCreating ? '⏳' : '➕'}</div>
              <h3 className="text-xl font-bold text-[#CCD6F6] mb-2">
                {isCreating ? 'Creating...' : 'Create Game'}
              </h3>
              <p className="text-[#8892B0] text-sm">Host a new match to challenge friends</p>
            </div>

            {/* Join Game */}
            <div className="space-y-4">
            <input
                type="text"
                value={lobbyCode}
                onChange={e => setLobbyCode(e.target.value)}
                placeholder="Enter lobby code"
                maxLength={36}
                className="w-full px-4 py-3 rounded-xl bg-[#0A192F] border border-[#64FFDA]/20 text-[#CCD6F6] outline-none"
            />
            </div>
            <div
              onClick={handleJoinGame}
              className="p-6 rounded-2xl bg-[#0A192F] border border-[#64FFDA]/20 hover:border-[#64FFDA]/50 transition-all hover:scale-105 cursor-pointer pointer-events-auto">
              <div className="text-5xl mb-4">🔍</div>
              <h3 className="text-xl font-bold text-[#CCD6F6] mb-2">Join Game</h3>
              <p className="text-[#8892B0] text-sm">Find a match or enter a game code</p>
            </div>

          </div>

          {/* Play Button */}
          <div className="flex justify-center pt-4">
            <Button 
              variant="Play"
              onClick={handleCreateGame}
              disabled={isCreating}
            >
              {isCreating ? 'Connecting...' : 'Start New Game'}
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
