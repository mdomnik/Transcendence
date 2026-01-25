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

const SUGGESTED_TOPICS = [
  "Countries",
  "Cities",
  "Capitals",
  "Movies",
  "Food",
  "Technology",
  "Animals",
  "Science",
  "History",
  "Sports",
  "Music",
  "Art",
  "Space",
  "Literature",
  "Nature",
  "Gaming",
];

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
    correctnessMap?: Record<string, Record<string, boolean>>;
    scoreDeltas?: Record<string, number>;
    totalScores?: Record<string, number>;
    finalScores?: Record<string, number>;
    winners?: string[];
  };
};

type QuestionSelectionView = {
  phase: "SELECT_TOPIC";
  proposals: Array<{
    userId: string;
    topicTitle: string;
    difficulty: "EASY" | "MEDIUM" | "HARD";
    votes: number;
  }>;
};

/* ===================== ANSWER BALL ===================== */

function AnswerBall({ filled, isCorrect }: { filled: boolean; isCorrect?: boolean }) {
  return (
    <div
      className={`w-3 h-3 rounded-full transition ${
        filled
          ? isCorrect === false
            ? "bg-red-500"
            : "bg-[#64FFDA]"
          : "border border-white/20"
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
  const [shuffledQuestions, setShuffledQuestions] = useState<Question[]>([]);

  /* ---------- animation helpers ---------- */
  const prevVotesRef = useRef<Record<string, number>>({});
  const prevProposalCountRef = useRef(0);

  const [votePulse, setVotePulse] = useState<Record<string, boolean>>({});
  const [animateAppear, setAnimateAppear] = useState(false);

  // Track last answered question for feedback animation
  const [lastAnsweredQuestionId, setLastAnsweredQuestionId] = useState<string | null>(null);
  const [lastAnsweredAnswerId, setLastAnsweredAnswerId] = useState<string | null>(null);
  const [lastAnsweredCorrect, setLastAnsweredCorrect] = useState<boolean | null>(null);
  const [showingFeedback, setShowingFeedback] = useState(false);

  // Track round changes to reset feedback state
  const prevRoundRef = useRef<number | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <main className="relative min-h-screen bg-[#0A192F] flex items-center justify-center">
        <div className="text-[#64FFDA] text-xl">Loading...</div>
      </main>
    );
  }

  if (!user) return null;

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
      // If match is finished, only redirect if it's NOT the MATCH_END phase
      // This allows us to show the results screen.
      if (view.match?.state === "FINISHED" && view.phase?.state !== "MATCH_END") {
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

  const isMatchEnd = phase === "MATCH_END";
  const finalScores = game?.roundData?.finalScores ?? {};
  const winners = game?.roundData?.winners ?? [];

  const isVotingLike = phase === "VOTING" || phase === "SELECT_TOPIC";

  const phaseLabel = phase?.replaceAll("_", " ") ?? "";

  // Calculate winning proposal
  const winningProposal = proposals.length > 0 
    ? proposals.reduce((prev, curr) => 
        (curr.votes ?? 0) > (prev.votes ?? 0) ? curr : prev
      , proposals[0])
    : null;

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
  function shuffle<T>(array: T[]): T[] {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  const handleLeaveCurrentLobby = async () => {
    if (!game?.lobbyId) return;
    try {
      await emitWithAck(getSocket(), "lobby:leave", {
        lobbyId: game.lobbyId,
      });
      router.replace("/dashboard?left=1");
    } catch (err) {
      console.error("Failed to leave lobby:", err);
    }
  };

  const quitGame = async () => {
    if (!game?.lobbyId) return;
    try {
      await emitWithAck(getSocket(), "game:quit", {
        lobbyId: game.lobbyId,
      });
    } catch (err) {
      console.error("Failed to quit game:", err);
    }
  };

  const handlePlayAgain = async () => {
    if (!game?.lobbyId) return;
    try {
      const res = await emitWithAck(getSocket(), "lobby:retry", {
        lobbyId: game.lobbyId,
      });
      if (res.ok) {
        router.replace("/lobby");
      }
    } catch (err) {
      console.error("Failed to reset lobby:", err);
    }
  };

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
  if (showingFeedback) return; // Prevent clicking during feedback
  
  try {
    console.log('🟢 submitting answer', { qid, aid });
    await emitWithAck(getSocket(), "game:submit-answer", {
      lobbyId: game?.lobbyId,
      questionId: qid,
      answerId: aid,
    });
    
    setLastAnsweredQuestionId(qid);
    setLastAnsweredAnswerId(aid);
    setShowingFeedback(true);
  } catch (e) {
    console.error("submitAnswer failed", e);
  }
};

useEffect(() => {
  if (!game?.roundData?.questions) return;

  const qs = game?.roundData?.questions;
  if (!qs || qs.length === 0) return;

  const shuffledQuestions = qs.map((q) => ({
    ...q,
    answers: shuffle(q.answers),
  }));

  setShuffledQuestions(shuffledQuestions);

  // reset per-round UI state
  setLastAnsweredQuestionId(null);
  setLastAnsweredAnswerId(null);
  setLastAnsweredCorrect(null);
  setShowingFeedback(false);
}, [game?.roundData?.questions]);

// Listen for correctness updates
useEffect(() => {
  if (!user || !lastAnsweredQuestionId || !game?.roundData?.correctnessMap) return;
  
  const correctness = game.roundData.correctnessMap[user.id]?.[lastAnsweredQuestionId];
  
  if (correctness !== undefined) {
    setLastAnsweredCorrect(correctness);
    
    // Clear feedback and allow next question after 1.5s
    const timer = setTimeout(() => {
      setLastAnsweredQuestionId(null);
      setLastAnsweredAnswerId(null);
      setLastAnsweredCorrect(null);
      setShowingFeedback(false);
    }, 1500);
    
    return () => clearTimeout(timer);
  }
}, [game?.roundData?.correctnessMap, user, lastAnsweredQuestionId]);

// Reset feedback state when entering a new ANSWERING phase (for round transitions)
useEffect(() => {
  const currentRound = game?.match?.round ?? 1;
  const currentPhase = game?.phase?.state ?? null;
  
  // When we enter ANSWERING phase for a new round, reset feedback states
  if (currentPhase === "ANSWERING" && prevRoundRef.current !== currentRound) {
    setLastAnsweredQuestionId(null);
    setLastAnsweredAnswerId(null);
    setLastAnsweredCorrect(null);
    setShowingFeedback(false);
    prevRoundRef.current = currentRound;
  }
}, [game?.match?.round, game?.phase?.state]);

  /* ===================== RENDER ===================== */

  console.log('phase', phase);
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

      {phase === "ROUND_START" ? (
        /* ---------- ROUND START TRANSITION ---------- */
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-8 animate-in fade-in zoom-in duration-500">
            <div className="text-[#64FFDA] text-2xl font-bold uppercase tracking-widest">
              Round
            </div>
            <div className="text-white text-9xl font-black animate-pulse">
              {round}
            </div>
            <div className="text-[#8892B0] text-lg">
              Get ready...
            </div>
          </div>
        </div>
      ) : phase === "ROUND_END" ? (
        /* ---------- ROUND END RESULTS ---------- */
        <div className="flex-1 flex items-center justify-center p-12">
          <div className="max-w-3xl w-full bg-[#112240] border border-[#64FFDA]/30 rounded-3xl p-10 shadow-2xl">
            <div className="text-center mb-8">
              <div className="text-[#64FFDA] text-sm font-bold uppercase tracking-widest mb-2">
                Round {round} Complete
              </div>
              <h2 className="text-white text-4xl font-black">Results</h2>
            </div>

            <div className="space-y-4">
              {players
                .slice()
                .sort((a, b) => {
                  const deltaA = game?.roundData?.scoreDeltas?.[a.userId] ?? 0;
                  const deltaB = game?.roundData?.scoreDeltas?.[b.userId] ?? 0;
                  return deltaB - deltaA;
                })
                .map((p, i) => {
                  const delta = game?.roundData?.scoreDeltas?.[p.userId] ?? 0;
                  const total = game?.roundData?.totalScores?.[p.userId] ?? 0;
                  const previous = total - delta;

                  return (
                    <div
                      key={p.userId}
                      className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${
                        i === 0 && delta > 0
                          ? "bg-[#64FFDA]/10 border-[#64FFDA] shadow-lg shadow-[#64FFDA]/5"
                          : "bg-[#0A192F]/50 border-white/10"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-black ${
                            i === 0
                              ? "bg-yellow-500 text-[#0A192F]"
                              : i === 1
                              ? "bg-slate-300 text-[#0A192F]"
                              : i === 2
                              ? "bg-amber-600 text-[#0A192F]"
                              : "bg-white/10 text-[#8892B0]"
                          }`}
                        >
                          {i + 1}
                        </div>
                        <div>
                          <div
                            className={`text-lg font-bold ${
                              p.userId === userId ? "text-white" : "text-[#CCD6F6]"
                            }`}
                          >
                            {p.username} {p.userId === userId && "(You)"}
                          </div>
                          <div className="text-xs text-[#8892B0]">
                            Previous: {previous}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div
                          className={`text-2xl font-black font-mono ${
                            delta > 0 ? "text-green-400" : "text-[#8892B0]"
                          }`}
                        >
                          {delta > 0 ? "+" : ""}{delta}
                        </div>
                        <div className="text-sm text-[#64FFDA] font-mono font-bold">
                          Total: {total}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="mt-8 text-center">
              <div className="text-[#8892B0] text-sm animate-pulse">
                Next round starting soon...
              </div>
            </div>
          </div>
        </div>
      ) : phase === "VOTING_START" ? (
        /* ---------- VOTING START TRANSITION ---------- */
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-8 animate-in fade-in zoom-in duration-500">
            <div className="text-6xl animate-bounce">🗳️</div>
            <div className="text-white text-6xl font-black tracking-tight">
              Voting Phase
            </div>
            <div className="text-[#64FFDA] text-xl uppercase tracking-widest animate-pulse">
              Choose your favorite topic
            </div>
          </div>
        </div>
      ) : phase === "ANSWERING" ? (
        /* ---------- ANSWERING ---------- */
        <div className="flex-1 flex gap-8 p-12 overflow-hidden">
          <div className="w-1/3 rounded-2xl border border-white/10 bg-[#0F223D] p-6 shadow-2xl">
            {winningProposal && (
              <div className="mb-6 pb-6 border-b border-[#64FFDA]/20">
                <div className="text-[#64FFDA] font-bold uppercase tracking-wider text-xs mb-3">
                  Current Topic
                </div>
                <div className="text-white text-xl font-bold mb-1">
                  {winningProposal.topicTitle}
                </div>
                <div className="text-[#64FFDA]/60 text-xs uppercase tracking-widest">
                  {winningProposal.difficulty}
                </div>
              </div>
            )}
            
            <div className="text-[#64FFDA] font-bold uppercase tracking-wider text-xs mb-6 border-b border-[#64FFDA]/20 pb-2">
              Live Progress
            </div>

            {players.map((p) => {
              const answered = game?.roundData?.answeredBy?.[p.userId] ?? [];
              const correctness = game?.roundData?.correctnessMap?.[p.userId] ?? {};
              
              return (
                <div key={p.userId} className="mb-6 last:mb-0">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white font-medium">{p.username}</span>
                    <span className="text-[10px] text-[#8892B0]">
                      {answered.length}/{game?.roundData?.questions.length}
                    </span>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {game?.roundData?.questions.map((q: Question) => (
                      <AnswerBall 
                        key={q.id} 
                        filled={answered.includes(q.id)}
                        isCorrect={correctness[q.id]}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

          </div>

          <div className="flex-1 rounded-2xl border border-white/10 bg-[#0F223D] p-8 shadow-2xl flex flex-col">
            {(() => {
              // console.log('Does game data exist?', game);
              const qs: Question[] = shuffledQuestions;
              // console.log('Questions', qs);
              if (!user) {
                console.warn('User not found!');
                return null;
              }
              const myA = game?.roundData?.answeredBy?.[user.id] ?? [];
              console.trace('My answers:', myA);
              console.trace('Last answered question:', lastAnsweredAnswerId);
              console.trace('Showing feedback', showingFeedback);

              // Show the question we're showing feedback for, OR the next unanswered one
              const q = (() => {
                if (showingFeedback && lastAnsweredQuestionId) {
                  // Only show feedback if that question still exists
                  return qs.find(q => q.id === lastAnsweredQuestionId) ?? qs.find(q => !myA.includes(q.id));
                }
                return qs.find(q => !myA.includes(q.id));
              })();
              // console.log('Was question fetched?', q);
              if (!q)
                return (
                  <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-12 h-12 border-2 border-[#64FFDA]/20 border-t-[#64FFDA] rounded-full animate-spin" />
                    <div className="text-[#8892B0] font-medium">
                      All questions answered! <br />
                      <span className="text-sm opacity-60">
                        Waiting for other players to finish...
                      </span>
                    </div>
                  </div>
                );

              return (
                <div className="flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full">
                  <div className="mb-8">
                    <span className="text-[#64FFDA] text-xs font-bold uppercase tracking-widest mb-2 block">
                      Current Question
                    </span>
                    <h2 className="text-2xl text-white font-semibold leading-relaxed">
                      {q.text}
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {q.answers.map((a) => {
                      const correctness = game?.roundData?.correctnessMap?.[user.id] ?? {};
                      
                      const wasAnswered = myA.includes(q.id);
                      const wasCorrect = correctness[q.id];
                      
                      // Show feedback only for the specific answer that was clicked
                      const isThisAnswer = a.id === lastAnsweredAnswerId;
                      const showFeedback = showingFeedback && lastAnsweredQuestionId === q.id && isThisAnswer;
                      const isCorrect = showFeedback && wasCorrect === true;
                      const isWrong = showFeedback && wasCorrect === false;

                      return (
                        <button
                          key={a.id}
                          onClick={() => submitAnswer(q.id, a.id)}
                          disabled={wasAnswered || showingFeedback}
                          className={`group relative p-5 rounded-xl border transition-all text-left
                                     ${isCorrect 
                                       ? "border-green-500/70 bg-green-500/20 animate-shake-correct shadow-lg shadow-green-500/20" 
                                       : isWrong 
                                       ? "border-red-500/70 bg-red-500/20 animate-shake shadow-lg shadow-red-500/20" 
                                       : showingFeedback && !isThisAnswer
                                       ? "border-white/5 bg-white/5 opacity-30"
                                       : "border-white/10 bg-[#112240] hover:border-[#64FFDA]/50 hover:bg-[#112240]/80 cursor-pointer"
                                     }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className={`transition-colors ${
                              isCorrect 
                                ? "text-green-400 font-bold" 
                                : isWrong 
                                ? "text-red-400 font-bold" 
                                : showingFeedback && !isThisAnswer
                                ? "text-[#8892B0]"
                                : "text-[#CCD6F6] group-hover:text-white"
                            }`}>
                              {a.text}
                            </span>
                            <span className={`text-2xl transition-all ${
                              isCorrect 
                                ? "opacity-100 scale-125 text-green-500" 
                                : isWrong 
                                ? "opacity-100 scale-125 text-red-500" 
                                : showingFeedback && !isThisAnswer
                                ? "opacity-0"
                                : "opacity-0 group-hover:opacity-100 text-[#64FFDA]"
                            }`}>
                              {isCorrect ? "✓" : isWrong ? "✗" : "→"}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      ) : (
        /* ---------- TOPIC / VOTING ---------- */
        <div className="flex-1 relative flex items-center justify-center p-12">
          {phase === "TOPIC_INPUT" && !mySubmitted ? (
            /* Topic Prompt in Center */
            <div className="max-w-2xl w-full bg-[#112240] rounded-3xl border border-[#64FFDA]/20 p-10 shadow-2xl space-y-8 animate-slide-in">
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold text-white">Select a Topic</h2>
                <p className="text-[#8892B0]">
                  Enter anything or pick a trending suggestion.
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <input
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Type your topic here..."
                    className="w-full px-6 py-4 rounded-2xl bg-[#0A192F] border border-white/10 text-white text-lg focus:border-[#64FFDA] outline-none transition-all shadow-inner"
                  />

                  {/* Scrolling Suggestions */}
                  <div className="mt-4 flex items-center gap-3 px-1">
                    <span className="text-[10px] text-[#64FFDA] uppercase font-bold tracking-tighter">
                      Ideas
                    </span>
                    <div className="flex-1 overflow-hidden whitespace-nowrap relative h-6 flex items-center pause-marquee rounded-lg bg-[#0A192F]/50">
                      <div className="animate-marquee flex gap-12 items-center">
                        {SUGGESTED_TOPICS.map((t, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setTopic(t)}
                            className="text-[#64FFDA]/40 text-[10px] uppercase tracking-[0.2em] font-bold hover:text-[#64FFDA] transition-colors"
                          >
                            {t}
                          </button>
                        ))}
                        {SUGGESTED_TOPICS.map((t, idx) => (
                          <button
                            key={`rep-${idx}`}
                            type="button"
                            onClick={() => setTopic(t)}
                            className="text-[#64FFDA]/40 text-[10px] uppercase tracking-[0.2em] font-bold hover:text-[#64FFDA] transition-colors"
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-4">
                  <div className="flex gap-3">
                    {(["EASY", "MEDIUM", "HARD"] as Difficulty[]).map((d) => (
                      <button
                        key={d}
                        onClick={() => setDifficulty(d)}
                        className={`px-5 py-2 rounded-xl text-xs font-bold tracking-widest border transition-all ${
                          difficulty === d
                            ? "bg-[#64FFDA]/10 border-[#64FFDA] text-[#64FFDA]"
                            : "border-white/10 text-white/40 hover:border-white/25"
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={submitTopic}
                    disabled={topic.trim().length < 3}
                    className="w-full max-w-xs py-4 rounded-2xl bg-[#64FFDA] text-[#0A192F] font-bold text-lg hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all shadow-lg shadow-[#64FFDA]/20"
                  >
                    Submit Topic
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Voting Display */
            <div className="flex flex-wrap gap-8 justify-center max-w-5xl">
              {proposals.length === 0 ? (
                <div className="text-center space-y-4">
                  <div className="text-5xl animate-bounce">✍️</div>
                  <div className="text-[#8892B0] text-lg">
                    Players are thinking...
                  </div>
                </div>
              ) : (
                proposals.map((p) => (
                  <button
                    key={p.userId}
                    onClick={() => submitVote(p.userId)}
                    disabled={
                      myVoted || p.userId === userId || phase === "SELECT_TOPIC"
                    }
                    className={`group relative w-64 h-44 rounded-3xl border transition-all flex flex-col items-center justify-center p-6
                             ${
                               p.userId === userId
                                 ? "border-white/10 bg-white/5 opacity-80"
                                 : "border-[#64FFDA]/30 bg-[#112240] hover:border-[#64FFDA] hover:scale-105 active:scale-95 shadow-xl hover:shadow-[#64FFDA]/10"
                             }`}
                    style={{
                      animation: votePulse[p.userId]
                        ? "votePulseCard 300ms"
                        : animateAppear
                        ? "topicAppear 400ms"
                        : undefined,
                    }}
                  >
                    <div className="text-white font-bold text-xl text-center mb-2 group-hover:text-[#64FFDA] transition-colors">
                      {p.topicTitle}
                    </div>
                    <div className="text-xs text-[#64FFDA]/60 uppercase tracking-widest">
                      {p.difficulty}
                    </div>

                    {isVotingLike && (
                      <div
                        className="absolute -top-3 -right-3 w-10 h-10 rounded-full
                                    bg-[#64FFDA] text-[#0A192F]
                                    flex items-center justify-center text-sm font-black shadow-lg"
                      >
                        {p.votes ?? 0}
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          )}

          {phase === "SELECT_TOPIC" && (
            <div className="absolute inset-0 bg-[#0A192F]/80 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="flex flex-col items-center gap-6">
                {(() => {
                  const winningProposal = proposals.length > 0 
                    ? proposals.reduce((prev, curr) => 
                        (curr.votes ?? 0) > (prev.votes ?? 0) ? curr : prev
                      , proposals[0])
                    : null;

                  return (
                    <>
                      <div className="text-center space-y-4">
                        <div className="text-[#64FFDA] text-sm font-bold uppercase tracking-widest opacity-70">
                          Winning Topic
                        </div>
                        <div className="text-white text-4xl font-black tracking-tight px-8 py-4 rounded-2xl bg-[#112240]/80 border border-[#64FFDA]/30 shadow-xl">
                          {winningProposal?.topicTitle || "Loading..."}
                        </div>
                        <div className="text-xs text-[#64FFDA]/60 uppercase tracking-widest">
                          {winningProposal?.difficulty}
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-center gap-3 mt-4">
                        <div className="w-12 h-12 border-2 border-[#64FFDA]/20 border-t-[#64FFDA] rounded-full animate-spin" />
                        <div className="text-[#8892B0] text-lg font-medium animate-pulse">
                          Generating questions...
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Results Overlay */}
      {isMatchEnd && (
        <div className="absolute inset-0 z-[100] bg-[#0A192F]/95 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-500">
          <div className="max-w-2xl w-full bg-[#112240] border border-[#64FFDA]/30 rounded-3xl p-10 shadow-2xl shadow-[#64FFDA]/10 flex flex-col items-center text-center space-y-8">
            <div className="space-y-4">
              <div className="text-6xl animate-bounce">
                {winners.includes(userId) ? "🎉" : "🏁"}
              </div>
              <h2 className="text-4xl font-black text-white tracking-tight">
                {winners.includes(userId) ? "Victory!" : "Game Over"}
              </h2>
              <p className="text-[#8892B0] text-lg">
                The match has reached its grand finale.
              </p>
            </div>

            <div className="w-full space-y-3">
              <div className="text-[10px] font-bold text-[#64FFDA] uppercase tracking-widest text-left px-2 mb-2">
                Final Standings
              </div>
              {players
                .slice()
                .sort((a, b) => (finalScores[b.userId] ?? 0) - (finalScores[a.userId] ?? 0))
                .map((p, i) => (
                  <div 
                    key={p.userId} 
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                      winners.includes(p.userId) 
                        ? "bg-[#64FFDA]/10 border-[#64FFDA] shadow-lg shadow-[#64FFDA]/5" 
                        : "bg-[#0A192F]/50 border-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black ${
                        i === 0 ? "bg-yellow-500 text-[#0A192F]" : 
                        i === 1 ? "bg-slate-300 text-[#0A192F]" : 
                        i === 2 ? "bg-amber-600 text-[#0A192F]" : "bg-white/10 text-[#8892B0]"
                      }`}>
                        {i + 1}
                      </div>
                      <span className={`text-lg font-bold ${p.userId === userId ? "text-white" : "text-[#CCD6F6]"}`}>
                        {p.username} {p.userId === userId && "(You)"}
                      </span>
                    </div>
                    <div className="text-2xl font-black text-[#64FFDA] font-mono">
                      {finalScores[p.userId] ?? 0}
                    </div>
                  </div>
                ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full">
              <button
                onClick={handlePlayAgain}
                className="flex-1 py-4 rounded-2xl bg-[#64FFDA] text-[#0A192F] font-black text-lg hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-[#64FFDA]/10"
              >
                Play Again
              </button>
              <button
                onClick={handleLeaveCurrentLobby}
                className="flex-1 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all"
              >
                Leave Game
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= BOTTOM BAR ================= */}
      <div className="border-t border-white/5 bg-[#0B1B33]/80 backdrop-blur-md px-10 py-6">
        <div className="grid grid-cols-4 gap-8 max-w-7xl mx-auto">
          {/* Scoreboard */}
          <div className="col-span-1 border-r border-white/5 pr-6">
            <div className="text-[#64FFDA] text-[10px] font-bold uppercase tracking-widest mb-4">
              Leaderboard
            </div>
            <div className="space-y-3">
              {players
                .slice()
                .sort((a, b) => b.score - a.score)
                .map((p, i) => (
                  <div key={p.userId} className="flex justify-between items-center text-sm">
                    <span className={`font-medium ${p.userId === userId ? "text-white" : "text-[#8892B0]"}`}>
                      {i === 0 ? "👑" : i + 1 + "."} {p.username}
                    </span>
                    <span className="text-[#64FFDA] font-mono font-bold">
                      {p.score}
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {/* Player Status */}
          <div className="col-span-2 px-6 flex flex-col justify-center text-center">
            {phase === "TOPIC_INPUT" && mySubmitted && (
              <div className="space-y-2">
                <div className="text-white font-medium">Topic Submitted!</div>
                <div className="text-[#8892B0] text-sm italic">
                  Waiting for {players.length - submittedBy.length} others to choose...
                </div>
              </div>
            )}

            {phase === "VOTING" && (
              <div className="space-y-2">
                <div className="text-white font-medium">
                  {myVoted ? "Vote Cast!" : "Choose your favorite topic above"}
                </div>
                {!myVoted && (
                  <div className="text-[#64FFDA] text-xs animate-pulse">
                    Click a card to vote
                  </div>
                )}
              </div>
            )}
            
            {phase === "ANSWERING" && (
              <div className="flex flex-col items-center gap-2">
                <div className="flex gap-1">
                  {game?.roundData?.questions.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 w-8 rounded-full ${
                        (game?.roundData?.answeredBy?.[userId]?.length ?? 0) > i
                          ? "bg-[#64FFDA]"
                          : "bg-white/10"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-[10px] text-[#8892B0] uppercase tracking-widest">
                  Your Progress
                </span>
              </div>
            )}
          </div>

          {/* Chat / Misc */}
          <div className="col-span-1 pl-6 border-l border-white/5">
            <div className="text-[#64FFDA] text-[10px] font-bold uppercase tracking-widest mb-3">
              Phase Info
            </div>
            <div className="text-[#8892B0] text-xs leading-relaxed">
              Phase: <span className="text-white">{phaseLabel}</span><br />
              Time: <span className="text-white">{timeLeft}s left</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
