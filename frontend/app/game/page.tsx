"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Button from "../components/Button";

// Sample question type
interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
}

// Sample questions (replace with API data)
const sampleQuestions: Question[] = [
  {
    id: 1,
    question: "What is the capital of France?",
    options: ["London", "Berlin", "Paris", "Madrid"],
    correctAnswer: 2,
  },
  {
    id: 2,
    question: "Which planet is known as the Red Planet?",
    options: ["Venus", "Mars", "Jupiter", "Saturn"],
    correctAnswer: 1,
  },
  {
    id: 3,
    question: "What is 2 + 2?",
    options: ["3", "4", "5", "6"],
    correctAnswer: 1,
  },
  {
    id: 4,
    question: "Who painted the Mona Lisa?",
    options: ["Van Gogh", "Picasso", "Da Vinci", "Michelangelo"],
    correctAnswer: 2,
  },
  {
    id: 5,
    question: "What is the largest ocean on Earth?",
    options: ["Atlantic", "Indian", "Arctic", "Pacific"],
    correctAnswer: 3,
  },
];

export default function GamePage() {
  const router = useRouter();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isAnswered, setIsAnswered] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [showCorrect, setShowCorrect] = useState(false);

  const currentQuestion = sampleQuestions[currentQuestionIndex];
  const totalQuestions = sampleQuestions.length;

  // Timer countdown
  useEffect(() => {
    if (gameOver || isAnswered) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentQuestionIndex, isAnswered, gameOver]);

  const handleTimeUp = () => {
    setIsAnswered(true);
    setShowCorrect(true);
    setTimeout(() => nextQuestion(), 2000);
  };

  const handleAnswerSelect = (index: number) => {
    if (isAnswered) return;

    setSelectedAnswer(index);
    setIsAnswered(true);
    setShowCorrect(true);

    if (index === currentQuestion.correctAnswer) {
      setScore((prev) => prev + Math.ceil(timeLeft * 10)); // More points for faster answers
    }

    setTimeout(() => nextQuestion(), 2000);
  };

  const nextQuestion = () => {
    if (currentQuestionIndex + 1 >= totalQuestions) {
      setGameOver(true);
    } else {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setShowCorrect(false);
      setTimeLeft(30);
    }
  };

  const getOptionClass = (index: number) => {
    const baseClass =
      "w-full p-4 rounded-xl text-left transition-all duration-200 border-2";

    if (!showCorrect) {
      if (selectedAnswer === index) {
        return `${baseClass} bg-[#64FFDA]/20 border-[#64FFDA] text-[#CCD6F6]`;
      }
      return `${baseClass} bg-[#0A192F] border-[#64FFDA]/30 text-[#CCD6F6] hover:border-[#64FFDA] hover:bg-[#64FFDA]/10 cursor-pointer`;
    }

    // Show correct/incorrect after answering
    if (index === currentQuestion.correctAnswer) {
      return `${baseClass} bg-emerald-500/20 border-emerald-500 text-emerald-400`;
    }
    if (selectedAnswer === index && index !== currentQuestion.correctAnswer) {
      return `${baseClass} bg-red-500/20 border-red-500 text-red-400`;
    }
    return `${baseClass} bg-[#0A192F] border-[#64FFDA]/20 text-[#8892B0] opacity-50`;
  };

  // Game Over Screen
  if (gameOver) {
    const percentage = Math.round((score / (totalQuestions * 300)) * 100);
    
    return (
      <main className="relative min-h-screen bg-[#0A192F] flex items-center justify-center px-6">
        <div className="max-w-lg w-full rounded-3xl bg-[#112240] shadow-2xl border border-[#64FFDA]/30 p-10 text-center space-y-8">
          <div className="text-6xl">
            {percentage >= 80 ? "🏆" : percentage >= 50 ? "⭐" : "💪"}
          </div>
          
          <h1 className="text-4xl font-bold text-[#CCD6F6]">Game Over!</h1>
          
          <div className="space-y-4">
            <div className="text-6xl font-extrabold bg-gradient-to-r from-[#64FFDA] to-[#38BDF8] bg-clip-text text-transparent">
              {score}
            </div>
            <p className="text-[#8892B0]">Total Points</p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-4 rounded-xl bg-[#0A192F] border border-[#64FFDA]/20">
              <div className="text-2xl font-bold text-[#64FFDA]">{percentage}%</div>
              <div className="text-sm text-[#8892B0]">Accuracy</div>
            </div>
            <div className="p-4 rounded-xl bg-[#0A192F] border border-[#64FFDA]/20">
              <div className="text-2xl font-bold text-[#64FFDA]">{totalQuestions}</div>
              <div className="text-sm text-[#8892B0]">Questions</div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Button variant="Play" onClick={() => window.location.reload()}>
              Play Again
            </Button>
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen bg-[#0A192F] flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[#64FFDA]/20">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-[#8892B0] hover:text-[#64FFDA] transition-colors"
        >
          ← Exit Game
        </button>
        
        <div className="flex items-center gap-6">
          <div className="text-[#CCD6F6]">
            <span className="text-[#64FFDA] font-bold">{currentQuestionIndex + 1}</span>
            <span className="text-[#8892B0]">/{totalQuestions}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-[#8892B0]">Score:</span>
            <span className="text-[#64FFDA] font-bold">{score}</span>
          </div>
        </div>
      </header>

      {/* Main Game Area */}
      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="max-w-2xl w-full space-y-8">
          
          {/* Timer */}
          <div className="flex justify-center">
            <div className={`w-20 h-20 rounded-full border-4 flex items-center justify-center text-3xl font-bold transition-colors ${
              timeLeft <= 10 ? "border-red-500 text-red-500" : "border-[#64FFDA] text-[#64FFDA]"
            }`}>
              {timeLeft}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 bg-[#112240] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#64FFDA] to-[#38BDF8] transition-all duration-1000"
              style={{ width: `${(timeLeft / 30) * 100}%` }}
            />
          </div>

          {/* Question Card */}
          <div className="rounded-3xl bg-[#112240] shadow-2xl border border-[#64FFDA]/30 p-8">
            <h2 className="text-2xl font-bold text-[#CCD6F6] text-center mb-8">
              {currentQuestion.question}
            </h2>

            {/* Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentQuestion.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  disabled={isAnswered}
                  className={getOptionClass(index)}
                >
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#64FFDA]/20 text-[#64FFDA] font-bold mr-3">
                    {String.fromCharCode(65 + index)}
                  </span>
                  {option}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
