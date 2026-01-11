'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSocket } from '../lib/socket';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';

interface Question {
  id: string;
  question: string;
  options: string[];
  timeLimit: number;
}

interface PlayerScore {
  userId: string;
  username: string;
  score: number;
}

export default function QuizPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [scores, setScores] = useState<PlayerScore[]>([]);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [finalScores, setFinalScores] = useState<PlayerScore[]>([]);

  useEffect(() => {
    const socket = getSocket();

    // Question events
    socket.on('question-start', (data: { question: Question }) => {
      console.log('New question:', data.question);
      setCurrentQuestion(data.question);
      setTimeLeft(data.question.timeLimit);
      setSelectedAnswer(null);
      setHasAnswered(false);
      setIsCorrect(null);
    });

    socket.on('question-end', (data: { correctAnswer: number; scores: PlayerScore[] }) => {
      console.log('Question ended. Correct answer:', data.correctAnswer);
      setScores(data.scores);
      
      // Check if user's answer was correct
      if (selectedAnswer !== null) {
        setIsCorrect(selectedAnswer === data.correctAnswer);
      }
    });

    socket.on('scores-update', (data: { scores: PlayerScore[] }) => {
      console.log('Scores updated:', data.scores);
      setScores(data.scores);
    });

    socket.on('game-over', (data: { finalScores: PlayerScore[] }) => {
      console.log('Game over! Final scores:', data.finalScores);
      setGameOver(true);
      setFinalScores(data.finalScores);
      setCurrentQuestion(null);
    });

    socket.on('room:error', (error) => {
      console.error('Quiz error:', error);
      alert(error.message || 'An error occurred');
    });

    // Cleanup
    return () => {
      socket.off('question-start');
      socket.off('question-end');
      socket.off('scores-update');
      socket.off('game-over');
      socket.off('room:error');
    };
  }, [selectedAnswer]);

  // Timer countdown
  useEffect(() => {
    if (!currentQuestion || hasAnswered) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentQuestion, hasAnswered]);

  const handleAnswerSelect = (index: number) => {
    if (hasAnswered || !currentQuestion) return;

    const socket = getSocket();
    setSelectedAnswer(index);
    setHasAnswered(true);

    // Emit answer to backend
    socket.emit('submit-answer', {
      userId: user?.id,
      questionId: currentQuestion.id,
      answer: index,
      timeRemaining: timeLeft,
    });
  };

  const handlePlayAgain = () => {
    router.push('/lobby');
  };

  const handleBackToDashboard = () => {
    router.push('/dashboard');
  };

  // Game Over Screen
  if (gameOver) {
    const sortedScores = [...finalScores].sort((a, b) => b.score - a.score);
    const userRank = sortedScores.findIndex((s) => s.userId === user?.id) + 1;

    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A0E27] via-[#16213E] to-[#0F3460] flex items-center justify-center p-8">
        <div className="max-w-2xl w-full bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-8 text-center">
          <h1 className="text-5xl font-bold text-white mb-4">🎉 Game Over!</h1>
          <p className="text-2xl text-[#64FFDA] mb-8">
            You ranked #{userRank} out of {sortedScores.length} players
          </p>

          {/* Final Scoreboard */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">Final Scores</h2>
            <div className="space-y-3">
              {sortedScores.map((player, index) => (
                <div
                  key={player.userId}
                  className={`flex items-center justify-between bg-white/5 backdrop-blur-sm rounded-lg p-4 border ${
                    player.userId === user?.id ? 'border-[#64FFDA]' : 'border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-white">#{index + 1}</span>
                    <span className="text-white font-medium">{player.username}</span>
                    {player.userId === user?.id && (
                      <span className="text-[#64FFDA] text-sm">(You)</span>
                    )}
                  </div>
                  <span className="text-2xl font-bold text-[#64FFDA]">{player.score}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            <Button onClick={handlePlayAgain} variant="primary">
              Play Again
            </Button>
            <Button onClick={handleBackToDashboard} variant="secondary">
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Waiting for Question
  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A0E27] via-[#16213E] to-[#0F3460] flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#64FFDA] mx-auto mb-4"></div>
          <p className="text-white text-xl">Waiting for next question...</p>
        </div>
      </div>
    );
  }

  // Quiz Question Screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0E27] via-[#16213E] to-[#0F3460] flex items-center justify-center p-8">
      <div className="max-w-4xl w-full">
        {/* Timer and Scores */}
        <div className="flex justify-between items-center mb-8">
          <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 px-6 py-3">
            <span className="text-white/70 text-sm">Time Left</span>
            <p className={`text-3xl font-bold ${timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-[#64FFDA]'}`}>
              {timeLeft}s
            </p>
          </div>

          {/* Scoreboard */}
          <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 px-6 py-3">
            <span className="text-white/70 text-sm">Scores</span>
            <div className="flex gap-4 mt-1">
              {scores.slice(0, 3).map((player) => (
                <div key={player.userId} className="text-center">
                  <p className="text-white text-sm">{player.username}</p>
                  <p className="text-[#64FFDA] font-bold">{player.score}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-8 mb-6">
          <h2 className="text-3xl font-bold text-white mb-8">{currentQuestion.question}</h2>

          {/* Answer Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentQuestion.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswerSelect(index)}
                disabled={hasAnswered}
                className={`p-6 rounded-xl border-2 transition-all text-left ${
                  hasAnswered && selectedAnswer === index
                    ? isCorrect
                      ? 'bg-green-500/20 border-green-500'
                      : 'bg-red-500/20 border-red-500'
                    : hasAnswered
                    ? 'bg-white/5 border-white/10 opacity-50'
                    : 'bg-white/5 border-white/20 hover:border-[#64FFDA] hover:bg-white/10'
                } ${!hasAnswered ? 'cursor-pointer' : 'cursor-not-allowed'}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-[#64FFDA]">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className="text-white text-lg">{option}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Answer Feedback */}
          {hasAnswered && (
            <div className={`mt-6 p-4 rounded-lg ${isCorrect ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
              <p className={`text-center text-lg font-semibold ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
