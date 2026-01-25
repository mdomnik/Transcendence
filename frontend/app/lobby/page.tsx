"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { getSocket } from "../lib/socket";
import { emitWithAck } from "../lib/socketEmit";
import { useAuth } from "../context/AuthContext";
import { getFriends, Friendship } from "../lib/friends";
import Button from "../components/Button";
import LobbyChat from "../components/LobbyChat";

interface Player {
  userId: string;
  username: string;
  ready: boolean;
  votes: number;
  avatarPath?: string | null;
}

interface GameSettings {
  roundsTotal: number;
  timePerQuestion: number;
  questionsPerRound: number;
}

interface LobbyState {
  lobbyId: string;
  lobbyCode: string;
  ownerId: string;
  maxPlayers: number;
  members: Player[];
  config: GameSettings;
  state: "WAITING" | "SETUP" | "IN_GAME";
}

export default function LobbyPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [lobby, setLobby] = useState<LobbyState | null>(null);
  const [copied, setCopied] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [friends, setFriends] = useState<Friendship[]>([]);

  const codeRef = useRef<HTMLSpanElement | null>(null);

  const isHost = lobby?.ownerId === user?.id;

  const allReady = lobby?.members.every((p) => p.ready) ?? false;
  const playerCount = lobby?.members.length ?? 0;

  useEffect(() => {
    if (!user) return;
    const fetchFriendsData = () => getFriends().then(setFriends).catch(console.error);
    fetchFriendsData();

    const socket = getSocket();
    socket.on("presence:updated", fetchFriendsData);
    socket.on("friendship:updated", fetchFriendsData);
    socket.on("connect", fetchFriendsData);

    const interval = setInterval(fetchFriendsData, 10000);

    return () => {
      clearInterval(interval);
      socket.off("presence:updated", fetchFriendsData);
      socket.off("friendship:updated", fetchFriendsData);
      socket.off("connect", fetchFriendsData);
    };
  }, [user]);

  const canEditLimits = isHost && lobby?.state === "WAITING" && !allReady;

  const displayedCode = showCode ? lobby?.lobbyCode : "********";

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <main className="relative min-h-screen bg-[#0A192F] flex items-center justify-center">
        <div className="text-[#64FFDA] text-xl">Loading...</div>
      </main>
    );
  }

  if (!user) return null;

  useEffect(() => {
    if (authLoading || !user) return;

    const socket = getSocket();

    
    socket.on("lobby:update", (payload) => {
      /* if (payload.state === "FINISHED") {
        // TODO! Destroy the lobby instance and kick players out, otherwise lobby:update will be infinitely called
        socket.emit("lobby:terminate");
        router.replace("/dashboard");
      } else {
        setLobby(payload);
      } */
     setLobby(payload);
    });
    socket.on("game:state", (view) => {
      if (view.match.state === "IN_PROGRESS") {
        router.push("/game");
      }
    });
    
    socket.on("lobby:deleted", () => router.push("/dashboard"));
    socket.on("lobby:kicked", () => router.push("/dashboard"));
    
    socket.on(
      "lobby:removed",
      ({ reason }: { reason: "LEFT" | "KICKED" | "BANNED" }) => {
        if (reason === "KICKED") router.push("/dashboard?kicked=1");
        else if (reason === "BANNED") router.push("/dashboard?banned=1");
        else router.push("/dashboard");
      }
    );
    
    const sync = async () => {
      try {
        const res = await emitWithAck(socket, "lobby:sync");
        if (!res.ok) {
          router.replace('/dashboard');
          return ;
        }
        setLobby(res.data);

        if (res.data.state === "IN_PROGRESS") {
          router.replace('/game');
        }
      } catch (err) {
        console.warn('syncronization error caught:', err);
        router.push("/dashboard");
      }
    };
    socket.on("connect", sync);

    if (!socket.connected) socket.connect();
    else sync();

    return () => {
      socket.off("connect", sync);
      socket.off("lobby:update", setLobby);
      socket.off("lobby:start");
      socket.off("lobby:deleted");
      socket.off("lobby:kicked");
      socket.off("lobby:removed");
    };
  }, [authLoading, user, router]);

  const toggleReady = async () => {
    if (!lobby) return;

    const isReady = lobby.members.find((p) => p.userId === user?.id)?.ready;

    try {
      await emitWithAck(getSocket(), isReady ? "lobby:unready" : "lobby:ready", {
        lobbyId: lobby.lobbyId,
      });
      
    } catch (err) {
      console.warn('Emit failed:', err);
    }
  };

  const startGame = async () => {
    if (!lobby) return;
    try {
      await emitWithAck(getSocket(), "lobby:start", {
        lobbyId: lobby.lobbyId,
      });
    } catch (err) {
      console.warn("Start game failed:", err);
    }
  };

  const kickPlayer = async (targetId: string) => {
    if (!lobby) return;
    try {
      await emitWithAck(getSocket(), "lobby:kick", {
        lobbyId: lobby.lobbyId,
        targetId,
      });
    } catch (err) {
      console.warn('Emit failed:', err);
    }
  };

  const banPlayer = async (targetId: string, username: string) => {
    if (!lobby) return;

    const confirmed = window.confirm(
      `Are you sure you want to ban ${username}?`
    );
    if (!confirmed) return;

    try {
      await emitWithAck(getSocket(), "lobby:ban", {
        lobbyId: lobby.lobbyId,
        targetId,
      });
    } catch (err) {
      console.warn('Emit failed:', err);
    }
  };

  const leaveLobby = async () => {
    if (!lobby) return;
    try {
      await emitWithAck(getSocket(), "lobby:leave", {
        lobbyId: lobby.lobbyId,
      });
    } catch (err) {
      console.warn('Emit failed:', err);
    }
  };

  const updateSetting = async (
    key: keyof GameSettings | "maxPlayers",
    delta?: number,
    value?: string
  ) => {
    if (!lobby || !isHost || allReady) return;

    try {
      await emitWithAck(getSocket(), "lobby:config", {
        lobbyId: lobby.lobbyId,
        key,
        delta,
        value,
      });
    } catch (err) {
      console.warn('Emit failed:', err);
    }
  };

  const copyCode = async () => {
    if (!lobby) return;
    await navigator.clipboard.writeText(lobby.lobbyCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const selectCode = () => {
    if (!codeRef.current) return;
    const range = document.createRange();
    range.selectNodeContents(codeRef.current);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  };

  if (authLoading || !user || !lobby) return null;

  const settings = lobby.config;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0E27] via-[#16213E] to-[#0F3460] flex flex-col items-center justify-center p-8">
      <div className="max-w-4xl w-full space-y-6">
        <button
          onClick={() => router.push("/dashboard?fromLobby=1")}
          className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all shadow-lg backdrop-blur-sm w-fit"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4 transition-transform group-hover:-translate-x-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          <span className="text-sm font-medium">Dashboard</span>
        </button>

        {/* MAIN LOBBY */}
        <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-8">
          {/* Header */}
          <div className="mb-8 flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold text-white">Game Lobby</h1>
            </div>

            <div className="flex flex-col items-end">
              <div className="bg-white/10 rounded-xl border border-white/10 p-4">
                <div className="flex items-center gap-4">
                  <span className="text-[#64FFDA] font-semibold text-sm">
                    Lobby Code
                  </span>

                  <span
                    ref={codeRef}
                    onClick={selectCode}
                    className="font-mono text-[#64FFDA] cursor-pointer select-none tracking-widest"
                  >
                    {displayedCode}
                  </span>

                  <div className="flex gap-2">
                    <button
                      onClick={copyCode}
                      className="text-xs bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      {copied ? "Copied!" : "Copy"}
                    </button>

                    <button
                      onClick={() => setShowCode((v) => !v)}
                      className="text-xs bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      {showCode ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Players */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-2xl font-semibold text-white">
                Players ({playerCount}/{lobby.maxPlayers})
              </h2>

              {isHost && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateSetting("maxPlayers", -1)}
                    disabled={!canEditLimits || lobby.maxPlayers <= playerCount || lobby.maxPlayers <= 2}
                    className="w-6 h-6 rounded border border-white/20 text-white text-sm hover:bg-white/10 disabled:opacity-40"
                  >
                    −
                  </button>
                  <button
                    onClick={() => updateSetting("maxPlayers", +1)}
                    disabled={!canEditLimits}
                    className="w-6 h-6 rounded border border-white/20 text-white text-sm hover:bg-white/10 disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {lobby.members.map((p) => {
                const isOwner = p.userId === lobby.ownerId;
                const isSelf = p.userId === user.id;
                const showKick = isHost && !isOwner && !isSelf;

                return (
                  <div
                    key={p.userId}
                    className="flex items-center justify-between bg-white/5 p-4 rounded-lg border border-white/10"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#64FFDA] to-[#38BDF8] flex items-center justify-center overflow-hidden">
                        {p.avatarPath ? (
                          <img
                            src={`${p.avatarPath}?v=${Date.now()}`}
                            alt={p.username}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[#0A0E27] font-bold">
                            {p.username.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span className="text-white font-medium">
                        {p.username}
                      </span>
                      {isSelf && (
                        <span className="text-[#64FFDA] text-sm">(You)</span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {isOwner && <span>👑</span>}

                      {showKick && (
                        <>
                          <button
                            onClick={() => kickPlayer(p.userId)}
                            className="hover:opacity-80"
                            title="Kick"
                          >
                            ❌
                          </button>

                          <button
                            onClick={() => banPlayer(p.userId, p.username)}
                            className="hover:opacity-80"
                            title="Ban"
                          >
                            🚫
                          </button>
                        </>
                      )}

                      <div className="w-24 text-center px-3 py-1.5 rounded-md border border-white/10">
                        <span
                          className={
                            p.ready ? "text-green-400" : "text-white/50"
                          }
                        >
                          {p.ready ? "Ready" : "Waiting"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center">
            <div className="flex gap-4">
              <Button onClick={toggleReady}>
                {lobby.members.find((p) => p.userId === user?.id)?.ready ? "Unready" : "Ready"}
              </Button>
              <Button variant="outline" onClick={leaveLobby}>
                Leave Lobby
              </Button>
            </div>

            {isHost && (
              <Button onClick={startGame} disabled={!allReady}>
                Start Game
              </Button>
            )}
          </div>
        </div>

        {/* GAME SETTINGS */}
        <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-semibold text-white">Game Settings</h2>
            {allReady && (
              <span className="text-[#64FFDA] text-sm font-medium">
                🔒 Locked in
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Setting
              label="Rounds"
              value={settings.roundsTotal}
              min={1}
              max={15}
              disabled={!isHost || allReady}
              onIncrement={() => updateSetting("roundsTotal", +1)}
              onDecrement={() => updateSetting("roundsTotal", -1)}
            />

            <Setting
              label="Questions"
              value={settings.questionsPerRound}
              min={3}
              max={12}
              disabled={!isHost || allReady}
              onIncrement={() => updateSetting("questionsPerRound", +1)}
              onDecrement={() => updateSetting("questionsPerRound", -1)}
            />

            <Setting
              label="Time"
              value={settings.timePerQuestion}
              min={10}
              max={60}
              step={5}
              disabled={!isHost || allReady}
              onIncrement={() => updateSetting("timePerQuestion", +5)}
              onDecrement={() => updateSetting("timePerQuestion", -5)}
            />
          </div>
        </div>
      </div>

      <LobbyChat lobbyId={lobby.lobbyId} currentUser={user} friends={friends} />
    </div>
  );
}

function Setting({
  label,
  value,
  min,
  max,
  disabled,
  onIncrement,
  onDecrement,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  disabled: boolean;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm text-white/60 font-medium">{label}</span>
      <div className="flex items-center gap-4 bg-white/5 rounded-xl p-2 border border-white/10">
        <button
          onClick={onDecrement}
          disabled={disabled || value <= min}
          className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-white text-lg hover:bg-white/10 disabled:opacity-40 flex items-center justify-center transition-colors"
        >
          −
        </button>
        <span className="flex-1 text-center text-xl font-bold text-white">
          {value}
        </span>
        <button
          onClick={onIncrement}
          disabled={disabled || value >= max}
          className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-white text-lg hover:bg-white/10 disabled:opacity-40 flex items-center justify-center transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}
