"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Button from "../components/Button";
import { useAuth } from "../context/AuthContext";

type Difficulty = 1 | 2 | 3;

interface Answer {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface Question {
  id: string;
  text: string;
  answers: Answer[];
  difficulty: string;
}

export default function SoloQuizPage() {
  const router = useRouter();
  const { user } = useAuth();

  // Setup State
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>(2);
  const [qnum, setQnum] = useState(5);
  const [isStarted, setIsStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quiz State
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const startQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/quiz/questions?topic=${encodeURIComponent(topic.trim())}&qnum=${qnum}&difficulty=${difficulty}`,
        {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to generate questions");
      }

      const data = await res.json();
      if (!data || data.length === 0) {
        throw new Error("No questions returned for this topic.");
      }

      setQuestions(data);
      setIsStarted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswer = (answer: Answer) => {
    if (isAnswered) return;
    
    setSelectedAnswerId(answer.id);
    setIsAnswered(true);

    if (answer.isCorrect) {
      setScore(prev => prev + 1);
    }

    setTimeout(() => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setSelectedAnswerId(null);
            setIsAnswered(false);
        } else {
            setIsFinished(true);
        }
    }, 1500);
  };

  if (isFinished) {
    const accuracy = Math.round((score / questions.length) * 100);
    return (
      <main className="min-h-screen bg-[#0A192F] flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-[#112240] p-10 rounded-3xl border border-[#64FFDA]/30 shadow-2xl space-y-8">
            <div className="text-6xl">🎊</div>
            <h2 className="text-3xl font-bold text-[#CCD6F6]">Quiz Complete!</h2>
            
            <div className="space-y-2">
                <div className="text-5xl font-black text-[#64FFDA]">{score} / {questions.length}</div>
                <p className="text-[#8892B0]">Correct Answers</p>
            </div>

            <div className={`text-xl font-bold ${accuracy >= 80 ? 'text-green-400' : accuracy >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                {accuracy}% Accuracy
            </div>

            <div className="flex gap-4">
                <Button variant="Play" className="flex-1" onClick={() => window.location.reload()}>TRY ANOTHER</Button>
                <Button variant="outline" className="flex-1" onClick={() => router.push('/dashboard')}>DASHBOARD</Button>
            </div>
        </div>
      </main>
    );
  }

  if (isStarted) {
    const currentQ = questions[currentIndex];
    return (
      <main className="min-h-screen bg-[#0A192F] flex flex-col items-center justify-center p-6 relative">
          <div className="absolute top-8 left-8 right-8 flex justify-between items-center">
              <div className="text-[#64FFDA] font-mono">QUESTION {currentIndex + 1} / {questions.length}</div>
              <div className="text-[#8892B0] font-mono">SCORE: {score}</div>
          </div>

          <div className="max-w-2xl w-full space-y-8">
              <div className="bg-[#112240] p-8 md:p-12 rounded-3xl border border-[#64FFDA]/20 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
                      <div className="h-full bg-[#64FFDA] transition-all duration-1000" style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }} />
                  </div>

                  <h2 className="text-2xl md:text-3xl font-bold text-[#CCD6F6] text-center leading-tight mt-4">
                    {currentQ.text}
                  </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentQ.answers.map((ans, idx) => (
                  <button
                    key={ans.id}
                    disabled={isAnswered}
                    onClick={() => handleAnswer(ans)}
                    className={`p-6 rounded-2xl border-2 text-left transition-all ${
                        isAnswered 
                        ? (ans.isCorrect ? 'bg-green-500/20 border-green-500 text-green-400' : (selectedAnswerId === ans.id ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-white/5 border-white/5 opacity-40'))
                        : 'bg-[#112240] border-[#64FFDA]/20 hover:border-[#64FFDA] hover:bg-[#64FFDA]/5 text-[#CCD6F6]'
                    }`}
                  >
                    <span className="font-mono text-[#64FFDA] mr-4">{String.fromCharCode(65 + idx)}.</span>
                    {ans.text}
                  </button>
                ))}
              </div>
          </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0A192F] flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-[#112240] p-8 rounded-3xl border border-[#64FFDA]/30 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
            <h1 className="text-3xl font-black text-[#CCD6F6] tracking-tight">AI QUIZZER</h1>
            <p className="text-[#8892B0]">Generate a custom practice quiz instantly.</p>
        </div>

        {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                ⚠️ {error}
            </div>
        )}

        <form onSubmit={startQuiz} className="space-y-4">
            <div className="space-y-1">
                <label className="text-xs text-[#64FFDA] font-bold uppercase tracking-widest ml-1">Topic</label>
                <input 
                    required
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    placeholder="e.g. History of Rome, React Hooks, Space..."
                    className="w-full bg-[#0A192F] border border-[#64FFDA]/20 rounded-xl px-4 py-3 text-[#CCD6F6] focus:border-[#64FFDA] outline-none transition-all"
                />
            </div>

            <div className="grid grid-cols-3 gap-2">
                {([1, 2, 3] as const).map(d => (
                    <button
                        key={d}
                        type="button"
                        onClick={() => setDifficulty(d)}
                        className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                            difficulty === d ? 'bg-[#64FFDA]/20 border-[#64FFDA] text-[#64FFDA]' : 'border-white/10 text-[#8892B0]'
                        }`}
                    >
                        {d === 1 ? 'EASY' : d === 2 ? 'MEDIUM' : 'HARD'}
                    </button>
                ))}
            </div>

            <div className="space-y-1">
                <label className="text-xs text-[#64FFDA] font-bold uppercase tracking-widest ml-1">Number of Questions</label>
                <select 
                    value={qnum}
                    onChange={e => setQnum(Number(e.target.value))}
                    className="w-full bg-[#0A192F] border border-[#64FFDA]/20 rounded-xl px-4 py-3 text-[#CCD6F6] focus:border-[#64FFDA] outline-none appearance-none"
                >
                    <option value={5}>5 Questions</option>
                    <option value={10}>10 Questions</option>
                </select>
            </div>

            <Button 
                type="submit" 
                variant="Play" 
                className="w-full h-14"
                disabled={isLoading}
            >
                {isLoading ? 'GENERATING...' : 'START QUIZ'}
            </Button>
            
            <button 
                type="button"
                onClick={() => router.push('/dashboard')}
                className="w-full text-[#8892B0] text-sm hover:underline"
            >
                Back to Dashboard
            </button>
        </form>
      </div>
    </main>
  );
}
