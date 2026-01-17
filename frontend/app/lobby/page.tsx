"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { getSocket } from "../lib/socket";
import { emitWithAck } from "../lib/socketEmit";
import { useAuth } from "../context/AuthContext";
import Button from "../components/Button";

interface Player {
  userId: string;
  username: string;
  ready: boolean;
  votes: number;
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

  const codeRef = useRef<HTMLSpanElement | null>(null);

  const isHost = lobby?.ownerId === user?.id;
  const allReady = lobby?.members.every((p) => p.ready) ?? false;
  const playerCount = lobby?.members.length ?? 0;

  const canEditLimits = isHost && lobby?.state === "WAITING" && !allReady;

  const displayedCode = showCode ? lobby?.lobbyCode : "********";

  useEffect(() => {
    if (authLoading || !user) return;

    const socket = getSocket();

    const sync = async () => {
      try {
        await emitWithAck(socket, "lobby:sync");
      } catch (err) {
        console.warn('syncronization error caught:', err);
        router.push("/dashboard");
      }
    };

    socket.on("connect", sync);
    socket.on("lobby:update", (payload) => {
      if (payload.state === "FINISHED") {
        // TODO! Destroy the lobby instance and kick players out, otherwise lobby:update will be infinitely called
        socket.emit("lobby:terminate");
        router.push("/dashboard");
      } else {
      setLobby(payload);
      }
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
      console.warn('Emit failed:', err);
      }
    try {
      await emitWithAck(getSocket(), "setup:set-config", {
        lobbyId: lobby.lobbyId,
        config: lobby.config,
      });
    } catch (err) {
      console.warn('Emit failed:', err);
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

  const updateSetting = (
    key: keyof GameSettings | "maxPlayers",
    delta: number
  ) => {
    if (!lobby || !isHost || allReady) return;

    try {
      emitWithAck(getSocket(), "lobby:config", {
        lobbyId: lobby.lobbyId,
        key,
        delta,
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
    <div className="min-h-screen bg-gradient-to-br from-[#0A0E27] via-[#16213E] to-[#0F3460] flex items-center justify-center p-8">
      <div className="max-w-4xl w-full space-y-6">
        {/* MAIN LOBBY */}
        <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-8">
          {/* Header */}
          <div className="mb-8 flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold text-white">Game Lobby</h1>
              <p className="mt-1 text-sm text-[#64FFDA] font-mono">
                Lobby ID: {lobby.lobbyId}
              </p>
            </div>

            <div className="flex flex-col items-end">
              <div className="px-6 py-4 rounded-2xl bg-white/10 border border-white/20">
                <div className="flex items-center gap-4">
                  <span className="text-[#64FFDA] font-semibold">
                    Lobby Code
                  </span>

                  <span
                    ref={codeRef}
                    onClick={selectCode}
                    className="font-mono text-[#64FFDA] cursor-pointer select-none"
                  >
                    {displayedCode}
                  </span>

                  <button
                    onClick={copyCode}
                    className="border border-[#64FFDA]/40 px-3 py-1 rounded-md hover:bg-[#64FFDA]/10"
                  >
                    📋 {copied ? "Copied" : "Copy"}
                  </button>

                  <button
                    onClick={() => setShowCode((v) => !v)}
                    className="border border-[#64FFDA]/40 px-3 py-1 rounded-md hover:bg-[#64FFDA]/10"
                  >
                    {showCode ? "🙈 Hide" : "🐵 Show"}
                  </button>
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
                    disabled={!canEditLimits || lobby.maxPlayers <= playerCount}
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
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#64FFDA] to-[#38BDF8] flex items-center justify-center text-[#0A0E27] font-bold">
                        {p.username.charAt(0).toUpperCase()}
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
              <Button onClick={toggleReady}>Ready</Button>
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
          <div className="flex items-center justify-between mb-6">
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
    </div>
  );
}

function Setting({
  label,
  value,
  min,
  max,
  step = 1,
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
    <div
      className={`rounded-xl p-6 border transition ${
        disabled
          ? "border-white/5 opacity-60"
          : "border-white/15 hover:border-[#64FFDA]/40"
      }`}
    >
      <div className="mb-4 text-lg font-semibold text-white">{label}</div>

      <div className="flex items-center justify-center gap-6">
        <button
          onClick={onDecrement}
          disabled={disabled || value <= min}
          className="w-10 h-10 rounded-full border border-white/20 text-white text-xl font-bold hover:bg-white/10 disabled:opacity-40"
        >
          −
        </button>

        <div className="px-6 py-2 rounded-full bg-[#64FFDA]/15 text-[#64FFDA] font-semibold text-xl min-w-[64px] text-center">
          {value}
        </div>

        <button
          onClick={onIncrement}
          disabled={disabled || value >= max}
          className="w-10 h-10 rounded-full border border-white/20 text-white text-xl font-bold hover:bg-white/10 disabled:opacity-40"
        >
          +
        </button>
      </div>
    </div>
  );
}
