"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getSocket } from "../lib/socket";
import { emitWithAck } from "../lib/socketEmit";
import { useAuth } from "../context/AuthContext";

/* ===================== TYPES ===================== */

type Difficulty = "EASY" | "MEDIUM" | "HARD";

type Proposal = {
  userId: string;
  topicTitle: string;
  difficulty: Difficulty;
  votes?: number;
};

type Player = {
  userId: string;
  username: string;
  score: number;
};

type Question = {
  id: string;
  text: string;
  answers: { id: string; text: string }[];
};

type GameState = {
  phase?: {
    state: string;
    endsAt?: number;
  };
  match?: {
    state: string;
    round: number;
    roundsTotal: number;
  };
  lobbyId: string;
  players: Player[];
  roundData?: {
    proposals: Proposal[];
    submittedBy?: string[];
    votedBy?: string[];
    questions: Question[];
    answeredBy?: Record<string, string[]>;
  };
};

/* ===================== ANSWER BALL ===================== */

function AnswerBall({ filled }: { filled: boolean }) {
  return (
    <div
      className={`w-3 h-3 rounded-full transition ${
        filled ? "bg-[#64FFDA]" : "border border-white/20"
      }`}
    />
  );
}

/* ===================== PAGE ===================== */

export default function GamePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [game, setGame] = useState<GameState | null>(null);
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("EASY");
  const [now, setNow] = useState(Date.now());

  /* ---------- animation helpers ---------- */
  const prevVotesRef = useRef<Record<string, number>>({});
  const prevProposalCountRef = useRef(0);

  const [votePulse, setVotePulse] = useState<Record<string, boolean>>({});
  const [animateAppear, setAnimateAppear] = useState(false);

  /* ===================== CLOCK ===================== */

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  /* ===================== SOCKET ===================== */

  useEffect(() => {
    if (loading || !user) return;

    const socket = getSocket();

    const sync = async () => {
      if (!socket.connected) socket.connect();
      try {
        await emitWithAck(socket, "game:sync");
      } catch (err) {
        console.warn('Emit failed:', err);
      }
    };

    const onGameState = (view: GameState) => {
      if (!view) return;
      if (view.match?.state === "FINISHED") {
        // emitWithAck(socket, "lobby:terminated");
        router.replace("/dashboard");
        return;
      }
      setGame(view);
    };

    socket.on("game:state", onGameState);
    socket.on("game:quit-confirmed", () =>
      router.replace("/dashboard?left=1")
    );

    sync();

    return () => {
      socket.off("game:state", onGameState);
      socket.off("game:quit-confirmed");
    };
  }, [loading, user, router]);

  /* ===================== DERIVED (SAFE) ===================== */

  const userId = user?.id ?? "";

  const phase = game?.phase?.state ?? null;
  const round = game?.match?.round ?? 1;
  const totalRounds = game?.match?.roundsTotal ?? 1;

  const timeLeft =
    game?.phase?.endsAt != null
      ? Math.max(0, Math.ceil((game.phase.endsAt - now) / 1000))
      : null;

  const players: Player[] = game?.players ?? [];
  const proposals: Proposal[] = game?.roundData?.proposals ?? [];

  const submittedBy: string[] =
    phase === "TOPIC_INPUT" ? game?.roundData?.submittedBy ?? [] : [];

  const votedBy: string[] =
    phase === "VOTING" ? game?.roundData?.votedBy ?? [] : [];

  const mySubmitted = submittedBy.includes(userId);
  const myVoted = votedBy.includes(userId);

  const isVotingLike = phase === "VOTING" || phase === "SELECT_TOPIC";

  const phaseLabel = phase?.replaceAll("_", " ") ?? "";

  /* ===================== APPEAR ANIMATION ===================== */

  useEffect(() => {
    if (proposals.length > prevProposalCountRef.current) {
      setAnimateAppear(true);
      setTimeout(() => setAnimateAppear(false), 400);
    }
    prevProposalCountRef.current = proposals.length;
  }, [proposals.length]);

  /* ===================== VOTE PULSE ===================== */

  useEffect(() => {
    if (!proposals.length) return;

    const pulses: Record<string, boolean> = {};

    for (const p of proposals) {
      const prev = prevVotesRef.current[p.userId] ?? 0;
      const cur = p.votes ?? 0;
      if (cur > prev) pulses[p.userId] = true;
    }

    if (Object.keys(pulses).length) {
      setVotePulse(pulses);
      setTimeout(() => setVotePulse({}), 300);
    }

    prevVotesRef.current = Object.fromEntries(
      proposals.map((p) => [p.userId, p.votes ?? 0])
    );
  }, [proposals]);

  /* ===================== ACTIONS ===================== */

  const submitTopic = async () => {
    if (topic.trim().length < 3) return;
    try {
      await emitWithAck(getSocket(), "game:submit-topic", {
        lobbyId: game?.lobbyId,
        topicTitle: topic.trim(),
        difficulty,
      });
    } catch (err) {
      console.warn('Emit failed:', err);
    }
    setTopic("");
  };

  const submitVote = async (targetUserId: string) => {
    if (!isVotingLike || myVoted || targetUserId === userId) return;
    try {
      await emitWithAck(getSocket(), "game:submit-vote", {
        lobbyId: game?.lobbyId,
        votedForUserId: targetUserId,
      });
    } catch (err) {
      console.warn('Emit failed:', err);
    }
  };

const submitAnswer = async (qid: string, aid: string) => {
  try {
    console.log('🟢 submitting answer', { qid, aid });
      await emitWithAck(getSocket(), "game:submit-answer", {
        lobbyId: game?.lobbyId,
        questionId: qid,
        answerId: aid,
      });
  } catch (e) {
    console.error("submitAnswer failed", e);
  }
};


  const quitGame = async () => {
    try {
      await emitWithAck(getSocket(), "game:quit");
    } catch (err) {
      console.warn('Emit failed:', err);
    }
  };

  /* ===================== RENDER ===================== */

  return (
    <main className="min-h-screen bg-[#0A192F] flex flex-col">

      {/* ================= TOP BAR ================= */}
      <div className="px-10 py-6 border-b border-white/10 flex justify-between items-center">
        <button
          onClick={quitGame}
          className="rounded-lg border border-red-500/40 bg-red-500/10 px-6 py-2 text-red-400"
        >
          Quit Game
        </button>

        <div className="px-12 py-4 rounded-2xl border border-[#64FFDA]/30 bg-[#112240] text-center">
          <div className="text-[#64FFDA] font-bold tracking-widest text-sm">
            {phaseLabel}
          </div>
          {timeLeft !== null && (
            <div className="text-[#8892B0] text-sm mt-1">
              {timeLeft}s remaining
            </div>
          )}
        </div>

        <div className="text-white text-lg">
          Round {round}/{totalRounds}
        </div>
      </div>

      {/* ================= CENTER ================= */}

      {phase === "ANSWERING" ? (
        /* ---------- ANSWERING ---------- */
        <div className="flex-1 flex gap-8 p-12">
          <div className="w-1/3 rounded-2xl border border-white/10 bg-[#0F223D] p-4">
            <div className="text-[#64FFDA] font-semibold mb-4">Players</div>
            {players.map((p) => {
              const answered =
                game.roundData.answeredBy?.[p.userId] ?? [];
              return (
                <div key={p.userId} className="mb-4">
                  <div className="text-white text-sm mb-1">
                    {p.username}
                  </div>
                  <div className="flex gap-1">
                    {game.roundData.questions.map((q: Question) => (
                      <AnswerBall
                        key={q.id}
                        filled={answered.includes(q.id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex-1 rounded-2xl border border-white/10 bg-[#0F223D] p-6">
            {(() => {
              const qs: Question[] = game.roundData.questions;
              if (!user)
                return null;
              const myA = game.roundData.answeredBy?.[user.id] ?? [];
              const q = qs.find((q) => !myA.includes(q.id));
              if (!q)
                return (
                  <div className="text-center text-[#8892B0]">
                    Waiting for others…
                  </div>
                );

              return (
                <>
                  <div className="text-[#64FFDA] mb-2">{q.text}</div>
                  <div className="grid grid-cols-2 gap-4">
                    {q.answers.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => submitAnswer(q.id, a.id)}
                        className="p-4 rounded-xl border border-white/10 bg-[#112240]
                                   hover:border-[#64FFDA]/40"
                      >
                        {a.text}
                      </button>
                    ))}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      ) : (
        /* ---------- TOPIC / VOTING ---------- */
        <div className="flex-1 relative flex items-center justify-center p-12">
          <div className="flex flex-wrap gap-8 justify-center">
            {proposals.map((p) => (
              <button
                key={p.userId}
                onClick={() => submitVote(p.userId)}
                disabled={myVoted || p.userId === user?.id || phase === "SELECT_TOPIC"}
                className="relative w-60 h-40 rounded-2xl border border-[#64FFDA]/40
                           bg-[#64FFDA]/10 flex flex-col items-center justify-center"
                style={{
                  animation: votePulse[p.userId]
                    ? "votePulseCard 300ms"
                    : animateAppear
                    ? "topicAppear 400ms"
                    : undefined,
                }}
              >
                <div className="text-white font-semibold text-lg text-center px-3">
                  {p.topicTitle}
                </div>
                <div className="text-sm text-[#64FFDA]">{p.difficulty}</div>

                {isVotingLike && (
                  <div className="absolute top-3 right-3 w-7 h-7 rounded-full
                                  bg-[#64FFDA] text-[#0A192F]
                                  flex items-center justify-center text-sm font-bold">
                    {p.votes ?? 0}
                  </div>
                )}
              </button>
            ))}
          </div>

          {phase === "SELECT_TOPIC" && (
            <div className="absolute inset-0 bg-[#0A192F]/70 flex items-center justify-center">
              <div className="text-[#64FFDA] text-xl animate-pulse">
                Choosing topic…
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= BOTTOM BAR ================= */}
      <div className="border-t border-white/10 bg-[#0B1B33] px-10 py-6">
        <div className="grid grid-cols-3 gap-6">

          {/* Scoreboard */}
          <div className="border-r border-white/10 pr-4">
            <div className="text-[#64FFDA] font-semibold mb-3">
              Scoreboard
            </div>
            {players
              .slice()
              .sort((a, b) => b.score - a.score)
              .map((p, i) => (
                <div key={p.userId} className="flex justify-between text-sm">
                  <span className="text-white">
                    #{i + 1} {p.username}
                  </span>
                  <span className="text-[#64FFDA]">{p.score}</span>
                </div>
              ))}
          </div>

          {/* Topic input */}
          <div className="border-r border-white/10 px-4 text-center">
            {phase === "TOPIC_INPUT" && !mySubmitted && (
              <>
                <input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Enter topic"
                  className="w-full mb-3 px-4 py-2 rounded bg-[#112240]
                             border border-white/10"
                />
                <div className="flex justify-center gap-2 mb-3">
                  {(["EASY", "MEDIUM", "HARD"] as Difficulty[]).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className={`px-3 py-1 rounded border ${
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
                  className="px-5 py-2 rounded bg-[#64FFDA]/20 text-[#64FFDA]"
                >
                  Submit Topic
                </button>
              </>
            )}

            {phase === "TOPIC_INPUT" && mySubmitted && (
              <div className="text-[#8892B0]">
                Waiting for other players…
              </div>
            )}

            {phase === "VOTING" && (
              <div className="text-[#8892B0]">
                {myVoted ? "Vote submitted" : "Vote above"}
              </div>
            )}
          </div>

          {/* Chat */}
          <div className="pl-4">
            <div className="text-[#64FFDA] font-semibold mb-3">Chat</div>
            <div className="text-[#8892B0] text-sm">Chat coming soon…</div>
          </div>
        </div>
      </div>
    </main>
  );
}
