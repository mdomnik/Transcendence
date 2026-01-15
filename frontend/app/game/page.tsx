"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "../components/Button";
import { getSocket } from "../lib/socket";
import { emitWithAck } from '../lib/socketEmit';
import { useAuth } from '../context/AuthContext';

interface Player {
  userId: string;
  username: string;
}

interface GameSettings {
  roundsTotal: number;
  questionsPerRound: number;
  timePerQuestion: number;
}

interface SetupState {
  lobbyId: string;
  lobbyCode: string;
  ownerId: string;

  maxPlayers: number; // ✅ synced from backend

  members: Player[];
  config: GameSettings;
  state: 'SUGGEST' | 'VOTING';
}

export default function GameSetupPage() {
  const router = useRouter();
  const socket = getSocket();
  const [setup, setState] = useState<SetupState | null>(null);
  const { user, loading: authLoading } = useAuth();
  const roomId = setup?.lobbyId;

  const [topicInput, setTopicInput] = useState("");
  const [topics, setTopics] = useState<string[]>([]);
  const [votes, setVotes] = useState<Record<string, number>>({});

  useEffect(() => {
    if (authLoading || !user) return;

    const sync = async () => {
      try {
        await emitWithAck(socket, 'setup:sync');
      } catch {
        router.push('/dashboard');
      }
    }
    // socket.on("setup:start", (setup))\

/*     socket.on("setup:submit-topic", (state) => {
      setTopics(state.topics);
    });

    socket.on("setup:submit-vote", (state) => {
      setVotes(state.votes);
    });
 */
    socket.on('setup:state', (state) => {
      console.log(state);
      setTopics(state.proposals.topicTitle);
      setVotes(state.votedBy.size());
    });

    socket.on("setup:start-match", (topic: string) => {
      router.push(`/game?topic=${encodeURIComponent(topic)}`);
    });

    return () => {
      socket.off("setup:topic-update");
      socket.off("setup:state")
      socket.off("setup:start-match");
    };
  }, []);

  const addTopic = () => {
    if (!topicInput.trim()) return;
    socket.emit("setup:submit-topic", { roomId, topic: topicInput.trim() });
    setTopicInput("");
  };

  const vote = (topic: string) => {
    socket.emit("setup:submit-vote", { setup, topic });
  };

  const finalize = () => {
    socket.emit("setup:finalize", { roomId });
  };

  return (
    <main className="min-h-screen bg-[#0A192F] flex items-center justify-center px-6">
      <div className="max-w-xl w-full rounded-3xl bg-[#112240] border border-[#64FFDA]/30 p-8 space-y-6">

        <h1 className="text-3xl font-bold text-[#CCD6F6] text-center">
          Game Setup
        </h1>

        <div className="flex gap-2">
          <input
            value={topicInput}
            onChange={(e) => setTopicInput(e.target.value)}
            className="flex-1 rounded-xl bg-[#0A192F] border border-[#64FFDA]/30 px-4 py-3 text-[#CCD6F6]"
            placeholder="Suggest a topic..."
          />
          <Button onClick={addTopic}>Add</Button>
        </div>

        <div className="space-y-3">
          {topics.map((topic) => (
            <button
              key={topic}
              onClick={() => vote(topic)}
              className="w-full p-4 rounded-xl bg-[#0A192F] border border-[#64FFDA]/30 flex justify-between"
            >
              <span className="text-[#CCD6F6]">{topic}</span>
              <span className="text-[#64FFDA] font-bold">
                {votes[topic] ?? 0}
              </span>
            </button>
          ))}
        </div>

        <Button variant="Play" onClick={finalize}>
          Finalize Topic
        </Button>
      </div>
    </main>
  );
}
