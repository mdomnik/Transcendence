"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Button from "../components/Button";
import { getSocket } from "../lib/socket";
import { emitWithAck } from "../lib/socketEmit";
import { useAuth } from "../context/AuthContext";

// --- Types from Backend ---
type PhaseState =
  | 'TOPIC_INPUT'
  | 'VOTING'
  | 'SELECT_QUESTION'
  | 'ANSWERING'
  | 'ROUND_END'
  | 'MATCH_END';

interface MatchConfig {
  roundsTotal: number;
  timePerQuestion: number;
  questionsPerRound: number;
}

interface GameView {
  lobbyId: string;
  match: {
    state: 'SETUP' | 'IN_PROGRESS' | 'FINISHED';
    round: number;
    roundsTotal: number;
  };
  phase: {
    state: PhaseState;
    startedAt: number;
    endsAt: number | null;
  };
  players: Array<{
    userId: string;
    username: string;
    score: number;
    isConnected: boolean;
  }>;
  roundData: any; // Type narrowed in components
}

// --- Main Page Component ---
export default function GamePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [gameState, setGameState] = useState<GameView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const socket = getSocket();

  const sync = useCallback(async () => {
    try {
      const resp = await emitWithAck(socket, 'game:sync');
      if (resp.ok) {
        setGameState(resp.state);
        setError(null);
      } else {
        setError(resp.error || "Failed to sync game");
        if (resp.error === 'NOT_IN_GAME') router.push('/dashboard');
      }
    } catch (err) {
      console.error("Sync failed", err);
      setError("Connection lost. Trying to reconnect...");
    } finally {
      setLoading(false);
    }
  }, [socket, router]);

  useEffect(() => {
    if (authLoading || !user) return;

    if (!socket.connected) socket.connect();
    
    sync();

    socket.on('game:state', (view: GameView) => {
      setGameState(view);
    });

    socket.on('setup:state', (view: GameView) => {
      setGameState(view);
    });

    socket.on('disconnect', () => {
      setLoading(true);
    });

    socket.on('connect', sync);

    return () => {
      socket.off('game:state');
      socket.off('setup:state');
      socket.off('disconnect');
      socket.off('connect', sync);
    };
  }, [user, authLoading, socket, sync]);

  if (loading && !gameState) {
    return (
      <main className="min-h-screen bg-[#0A192F] flex flex-col items-center justify-center space-y-4">
        <div className="text-[#64FFDA] text-2xl animate-pulse font-mono">INITIALIZING GAME ENGINE...</div>
        {error && <div className="text-red-400 text-sm">{error}</div>}
      </main>
    );
  }

  if (!gameState) return null;

  // Render different UI based on phase
  const renderPhase = () => {
    const { phase } = gameState;

    switch (phase.state) {
      case 'ANSWERING':
        return <AnsweringView gameState={gameState} user={user} />;
      case 'ROUND_END':
        return <RoundEndView gameState={gameState} />;
      case 'MATCH_END':
        return <MatchEndView gameState={gameState} />;
      case 'SELECT_QUESTION':
        return (
          <div className="text-center space-y-6">
            <div className="text-4xl animate-bounce">🤖</div>
            <h2 className="text-2xl font-bold text-[#64FFDA]">AI IS GENERATING QUESTIONS...</h2>
            <p className="text-[#8892B0]">Please wait while we formulate your challenge.</p>
          </div>
        );
      default:
        return (
          <div className="text-center">
            <div className="text-[#64FFDA] text-2xl animate-pulse font-mono uppercase">
              SYNCING {phase.state}...
            </div>
          </div>
        );
    }
  };

  return (
    <main className="relative min-h-screen bg-[#0A192F] flex flex-col overflow-hidden">
      {/* HUD Bar */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-[#64FFDA]/10 bg-[#112240]/50 backdrop-blur-md z-20">
        <div className="flex items-center gap-4">
         <div className="px-3 py-1 rounded bg-[#64FFDA]/10 border border-[#64FFDA]/30">
            <span className="text-xs text-[#64FFDA] font-mono uppercase">Round</span>
            <div className="text-[#CCD6F6] font-bold">
              {gameState.match.round} <span className="opacity-40">/ {gameState.match.roundsTotal}</span>
            </div>
         </div>
        </div>

        <div className="flex items-center gap-8">
            {/* Leaderboard Summary */}
            <div className="hidden md:flex gap-4">
               {gameState.players.sort((a,b) => b.score - a.score).slice(0, 3).map(p => (
                  <div key={p.userId} className="text-xs flex flex-col items-end">
                      <span className="text-[#8892B0] truncate max-w-[80px]">{p.username}</span>
                      <span className="text-[#64FFDA] font-bold">{p.score}</span>
                  </div>
               ))}
            </div>
            
            <button 
              onClick={() => {
                if(confirm("Exit game? Your score will be lost.")) router.push('/dashboard')
              }}
              className="text-red-400 text-sm hover:underline"
            >
              QUIT
            </button>
        </div>
      </nav>

      <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
          {renderPhase()}
      </div>

      {/* Progress Footer */}
      {gameState.phase.endsAt && (
          <div className="absolute bottom-0 left-0 w-full h-1 bg-white/5">
              <TimerBar endsAt={gameState.phase.endsAt} startedAt={gameState.phase.startedAt} />
          </div>
      )}
    </main>
  );
}

// --- Sub-Components ---

function TimerBar({ endsAt, startedAt }: { endsAt: number; startedAt: number }) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const total = endsAt - startedAt;
    const interval = setInterval(() => {
      const remaining = endsAt - Date.now();
      const p = Math.max(0, (remaining / total) * 100);
      setProgress(p);
      if (p <= 0) clearInterval(interval);
    }, 100);
    return () => clearInterval(interval);
  }, [endsAt, startedAt]);

  return (
    <div 
      className="h-full bg-[#64FFDA] transition-all duration-100 linear" 
      style={{ width: `${progress}%` }}
    />
  );
}

function TopicInputView({ gameState, user }: { gameState: GameView; user: any }) {
  const [input, setInput] = useState("");
  const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const [submitted, setSubmitted] = useState(false);
  const socket = getSocket();

  useEffect(() => {
    if (gameState.roundData?.submittedBy?.includes(user?.id)) {
      setSubmitted(true);
    } else {
      setSubmitted(false);
    }
  }, [gameState.roundData, user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    socket.emit('setup:submit-topic', { 
        lobbyId: gameState.lobbyId, 
        topicTitle: input.trim(),
        difficulty
    });
  };

  if (submitted) {
    return (
      <div className="text-center space-y-4">
        <div className="text-4xl">✅</div>
        <h2 className="text-2xl text-[#64FFDA] font-bold uppercase">Topic Submitted!</h2>
        <p className="text-[#8892B0]">Waiting for other players to suggest topics...</p>
      </div>
    );
  }

  return (
    <div className="max-w-md w-full bg-[#112240] p-8 rounded-3xl border border-[#64FFDA]/30 shadow-2xl space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-[#CCD6F6]">Suggest a Topic</h2>
        <p className="text-[#8892B0] text-sm mt-2">What should the AI ask you about?</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input 
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. 80s Cyberpunk, React Hooks, Space Exploration"
          className="w-full bg-[#0A192F] border border-[#64FFDA]/20 rounded-xl px-4 py-3 text-[#CCD6F6] focus:border-[#64FFDA] outline-none transition-all"
        />

        <div className="flex gap-2">
            {(['EASY', 'MEDIUM', 'HARD'] as const).map(d => (
                <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                        difficulty === d ? 'bg-[#64FFDA]/20 border-[#64FFDA] text-[#64FFDA]' : 'border-white/10 text-[#8892B0]'
                    }`}
                >
                    {d}
                </button>
            ))}
        </div>

        <Button type="submit" variant="Play" className="w-full">
          SUBMIT TOPIC
        </Button>
      </form>
    </div>
  );
}

function VotingView({ gameState, user }: { gameState: GameView; user: any }) {
  const socket = getSocket();
  const proposals = gameState.roundData?.proposals || [];
  const hasVoted = gameState.roundData?.votedBy?.includes(user?.id);

  const handleVote = (userId: string) => {
    socket.emit('setup:submit-vote', { 
        lobbyId: gameState.lobbyId, 
        votedForUserId: userId 
    });
  };

  return (
    <div className="max-w-xl w-full space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-[#CCD6F6]">Cast Your Vote</h2>
        <p className="text-[#8892B0]">Select the best topic for this round</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {proposals.map((p: any) => (
          <button
            key={p.userId}
            disabled={hasVoted}
            onClick={() => handleVote(p.userId)}
            className={`group w-full p-6 rounded-2xl border-2 text-left transition-all ${
                hasVoted ? 'opacity-60 cursor-default' : 'hover:border-[#64FFDA] hover:bg-[#64FFDA]/5'
            } ${p.userId === user?.id ? 'border-[#64FFDA]/50 bg-[#64FFDA]/5' : 'border-white/10 bg-[#112240]'}`}
          >
            <div className="flex justify-between items-center">
              <div>
                <span className="text-xs text-[#64FFDA] font-mono uppercase tracking-widest">{p.difficulty}</span>
                <h3 className="text-xl font-bold text-[#CCD6F6] group-hover:text-[#64FFDA] transition-colors">{p.topicTitle}</h3>
              </div>
              <div className="text-right">
                  <span className="text-xs text-[#8892B0]">suggested by</span>
                  <div className="font-bold text-[#CCD6F6]">{p.userId === user?.id ? 'You' : 'Opponent'}</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {hasVoted && (
          <div className="text-center text-[#64FFDA] animate-pulse font-mono text-sm uppercase">
              Waiting for other players to finish voting...
          </div>
      )}
    </div>
  );
}

function AnsweringView({ gameState, user }: { gameState: GameView; user: any }) {
  const socket = getSocket();
  const data = gameState.roundData;
  const question = data?.questions?.[0]; // Assuming 1 question per snapshot
  const topic = data?.topic || "Challenge";
  const difficulty = data?.difficulty;
  const answered = data?.answeredBy?.[user?.id]?.includes(question?.id);
  
  if (!question) return (
    <div className="text-center text-[#64FFDA] animate-pulse">
      GENERATING {topic.toUpperCase()} QUESTIONS...
    </div>
  );

  const handleAnswer = (answerId: string) => {
    socket.emit('game:submit-answer', {
        lobbyId: gameState.lobbyId,
        questionId: question.id,
        answerId
    });
  };

  return (
    <div className="max-w-2xl w-full space-y-8">
       {/* Topic Label */}
       <div className="text-center space-y-1">
          <span className="px-3 py-1 bg-[#64FFDA]/10 text-[#64FFDA] text-[10px] font-bold rounded-full border border-[#64FFDA]/20 uppercase tracking-widest">
            {difficulty || 'AI'} Challenge
          </span>
          <h2 className="text-3xl font-black text-white italic tracking-tight">{topic}</h2>
       </div>

       <div className="bg-[#112240] rounded-3xl border border-[#64FFDA]/20 p-8 shadow-2xl relative">
          <h2 className="text-2xl md:text-3xl font-bold text-[#CCD6F6] text-center mb-10 leading-tight">
            {question.text}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {question.answers.map((ans: any, idx: number) => (
              <button
                key={ans.id}
                disabled={answered}
                onClick={() => handleAnswer(ans.id)}
                className={`p-5 rounded-xl text-left border-2 transition-all ${
                  answered 
                  ? 'opacity-50 cursor-default border-white/5' 
                  : 'border-[#64FFDA]/20 hover:border-[#64FFDA] hover:bg-[#64FFDA]/5'
                }`}
              >
                <span className="text-[#64FFDA] font-mono mr-3">{String.fromCharCode(65 + idx)}.</span>
                <span className="text-[#CCD6F6]">{ans.text}</span>
              </button>
            ))}
          </div>
       </div>

       {answered && (
          <div className="text-center space-y-2">
              <div className="text-2xl">⏳</div>
              <p className="text-[#64FFDA] font-mono animate-pulse">LOCKING IN ANSWER...</p>
          </div>
       )}
    </div>
  );
}

function RoundEndView({ gameState }: { gameState: GameView }) {
    const data = gameState.roundData;
    
    return (
        <div className="max-w-xl w-full bg-[#112240] rounded-3xl p-10 border border-[#64FFDA]/30 shadow-2xl text-center space-y-8">
            <h2 className="text-3xl font-bold text-[#CCD6F6]">Round Results</h2>
            
            <div className="space-y-4">
                {gameState.players.map(p => {
                    const delta = data.scoreDeltas[p.userId] || 0;
                    return (
                        <div key={p.userId} className="flex items-center justify-between p-4 bg-[#0A192F] rounded-2xl border border-white/5">
                            <span className="text-[#CCD6F6] font-bold">{p.username}</span>
                            <div className="flex items-center gap-4">
                                <span className={`text-sm ${delta > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {delta > 0 ? `+${delta}` : delta}
                                </span>
                                <span className="text-[#64FFDA] font-bold w-12">{data.totalScores[p.userId]}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <p className="text-[#8892B0] text-sm animate-pulse">Get ready for next round...</p>
        </div>
    );
}

function MatchEndView({ gameState }: { gameState: GameView }) {
    const data = gameState.roundData;
    const router = useRouter();

    return (
        <div className="max-w-xl w-full bg-[#112240] rounded-3xl p-10 border border-[#64FFDA]/30 shadow-2xl text-center space-y-10">
            <div className="text-7xl">🏆</div>
            <h2 className="text-5xl font-black text-white italic tracking-tighter">FINAL SCORE</h2>
            
            <div className="space-y-4">
                {Object.entries(data.finalScores).map(([uId, score]: [any, any]) => {
                    const player = gameState.players.find(p => p.userId === uId);
                    const isWinner = data.winners.includes(uId);
                    return (
                        <div key={uId} className={`flex items-center justify-between p-6 rounded-2xl border-2 ${
                            isWinner ? 'border-[#64FFDA] bg-[#64FFDA]/10' : 'border-white/5 bg-[#0A192F]'
                        }`}>
                            <div className="flex flex-col items-start">
                                {isWinner && <span className="text-[10px] text-[#64FFDA] font-mono mb-1">CHAMPION</span>}
                                <span className="text-xl font-bold text-white">{player?.username}</span>
                            </div>
                            <span className="text-4xl font-black text-[#64FFDA]">{score}</span>
                        </div>
                    );
                })}
            </div>

            <Button variant="Play" className="w-full h-16 text-xl" onClick={() => router.push('/dashboard')}>
                RETURN TO LOBBY
            </Button>
        </div>
    );
}

