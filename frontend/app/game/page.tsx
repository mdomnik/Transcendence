"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSocket } from "../lib/socket";
import { emitWithAck } from "../lib/socketEmit";
import { useAuth } from "../context/AuthContext";

type Difficulty = "EASY" | "MEDIUM" | "HARD";

export default function GamePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [game, setGame] = useState<any>(null);

  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("EASY");

  // ✅ timer ticker
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (loading || !user) return;

    const socket = getSocket();

    const sync = async () => {
      try {
        if (!socket.connected) socket.connect();
        await emitWithAck(socket, "game:sync");
      } catch {
        router.replace("/dashboard");
      }
    };

    const onState = (view: any) => {
      if (view.match.state === "FINISHED") {
        router.replace("/dashboard");
        return;
      }
      setGame(view);
    };

    socket.on("game:state", onState);
    socket.on("game:quit-confirmed", () => {
      router.replace("/dashboard?left=1");
    });

    sync();

    return () => {
      socket.off("game:state", onState);
      socket.off("game:quit-confirmed");
    };
  }, [loading, user, router]);

  if (!user) return null;

  if (!game) {
    return (
      <div className="min-h-screen bg-[#0A192F] flex items-center justify-center text-[#64FFDA]">
        Loading game…
      </div>
    );
  }

  const phase = game.phase.state;
  const round = game.match.round;
  const totalRounds = game.match.roundsTotal;

  const timeLeft =
    game.phase.endsAt != null
      ? Math.max(0, Math.ceil((game.phase.endsAt - now) / 1000))
      : null;

  const isTopicPhase = phase === "TOPIC_INPUT";

  const proposals =
    isTopicPhase && game.roundData?.phase === "TOPIC_INPUT"
      ? game.roundData.proposals
      : [];

  const mySubmitted =
    isTopicPhase && game.roundData?.phase === "TOPIC_INPUT"
      ? game.roundData.submittedBy.includes(user.id)
      : false;

  const submitTopic = async () => {
    if (!topic.trim()) return;
    await emitWithAck(getSocket(), "game:submit-topic", {
      lobbyId: game.lobbyId,
      topicTitle: topic.trim(),
      difficulty,
    });
    setTopic(""); // optional
  };

  const quitGame = async () => {
    await emitWithAck(getSocket(), "game:quit");
  };

  return (
    <main className="min-h-screen bg-[#0A192F] flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <button
          onClick={quitGame}
          className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-400 hover:bg-red-500/20"
        >
          Quit Game
        </button>

        <div className="text-center px-6 py-3 rounded-xl border border-[#64FFDA]/30 bg-[#112240]">
          <div className="text-[#64FFDA] font-semibold">{phase.replace("_", " ")}</div>
          {timeLeft !== null && (
            <div className="text-sm text-[#8892B0]">Time left: {timeLeft}s</div>
          )}
        </div>

        <div className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-white">
          Round {round}/{totalRounds}
        </div>
      </div>

      {/* Center topics */}
      <div className="flex-1 p-10">
        <div className="h-full rounded-2xl border border-white/10 bg-white/5 p-8 flex flex-wrap gap-6 items-start">
          {proposals.map((p: any) => (
            <div
              key={p.userId}
              className="w-56 h-32 rounded-xl border border-[#64FFDA]/40 bg-[#64FFDA]/10 flex flex-col items-center justify-center"
            >
              <div className="text-white text-lg font-semibold">{p.topicTitle}</div>
              <div className="text-sm text-[#64FFDA] mt-1">{p.difficulty}</div>
            </div>
          ))}

          {proposals.length === 0 && (
            <div className="text-[#8892B0]">Waiting for topics…</div>
          )}
        </div>
      </div>

      {/* Bottom submit */}
      <div className="border-t border-white/10 p-6">
        <div className="max-w-xl mx-auto rounded-2xl bg-[#112240] border border-[#64FFDA]/30 p-6 space-y-4">
          <div className="text-center text-[#64FFDA] font-semibold">Submit Topic</div>

          {mySubmitted ? (
            <div className="text-center text-[#8892B0]">
              Waiting for other players…
            </div>
          ) : (
            <>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Enter a topic"
                maxLength={40}
                className="w-full px-4 py-2 rounded-lg bg-[#0A192F] border border-white/10 text-white"
              />

              <div className="flex justify-center gap-2">
                {(["EASY", "MEDIUM", "HARD"] as Difficulty[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`px-3 py-1 rounded-md text-sm border ${
                      difficulty === d
                        ? "border-[#64FFDA] text-[#64FFDA]"
                        : "border-white/10 text-white/60"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>

              <button
                onClick={submitTopic}
                className="w-full py-2 rounded-lg bg-[#64FFDA]/20 text-[#64FFDA] hover:bg-[#64FFDA]/30"
              >
                Submit Topic
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
