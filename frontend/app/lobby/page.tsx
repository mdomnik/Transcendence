'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSocket } from '../lib/socket';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';

interface Player {
  id: string;
  username: string;
  isReady: boolean;
}

export default function LobbyPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  useEffect(() => {
    const socket = getSocket();

    // Connection events
    socket.on('connect', () => {
      console.log('Connected to lobby');
      setConnectionStatus('connected');
      
      // Join lobby when connected
      socket.emit('join-lobby', { 
        userId: user?.id, 
        username: user?.username 
      });
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from lobby');
      setConnectionStatus('disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setConnectionStatus('disconnected');
    });

    // Lobby events
    socket.on('room:created', ({ roomId }) => {
      console.log('Room created:', roomId);
      setRoomId(roomId);
    });

    socket.on('player-joined', (player: Player) => {
      console.log('Player joined:', player);
      setPlayers((prev) => [...prev, player]);
    });

    socket.on('player-left', ({ userId }: { userId: string }) => {
      console.log('Player left:', userId);
      setPlayers((prev) => prev.filter((p) => p.id !== userId));
    });

    socket.on('player-ready', ({ userId, isReady }: { userId: string; isReady: boolean }) => {
      console.log('Player ready status changed:', userId, isReady);
      setPlayers((prev) =>
        prev.map((p) => (p.id === userId ? { ...p, isReady } : p))
      );
    });

    socket.on('lobby-state', ({ players, roomId }: { players: Player[]; roomId: string }) => {
      console.log('Lobby state received:', players, roomId);
      setPlayers(players);
      setRoomId(roomId);
    });

    socket.on('game-starting', () => {
      console.log('Game starting! Redirecting to quiz...');
      router.push('/quiz');
    });

    socket.on('room:error', (error) => {
      console.error('Lobby error:', error);
      alert(error.message || 'An error occurred');
    });

    // Cleanup on unmount
    return () => {
      socket.emit('leave-lobby', { userId: user?.id });
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('room:created');
      socket.off('player-joined');
      socket.off('player-left');
      socket.off('player-ready');
      socket.off('lobby-state');
      socket.off('game-starting');
      socket.off('room:error');
    };
  }, [user, router]);

  const handleToggleReady = () => {
    const socket = getSocket();
    const newReadyState = !isReady;
    setIsReady(newReadyState);
    socket.emit('mark-ready', { 
      userId: user?.id, 
      isReady: newReadyState 
    });
  };

  const handleStartGame = () => {
    const socket = getSocket();
    socket.emit('start-game', { userId: user?.id });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0E27] via-[#16213E] to-[#0F3460] flex items-center justify-center p-8">
      <div className="max-w-4xl w-full bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Game Lobby</h1>
          {roomId && (
            <p className="text-[#64FFDA]">Room ID: {roomId}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <div className={`w-3 h-3 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500' : 
              connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 
              'bg-red-500'
            }`} />
            <span className="text-white/70 text-sm capitalize">{connectionStatus}</span>
          </div>
        </div>

        {/* Players List */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-white mb-4">
            Players ({players.length})
          </h2>
          <div className="space-y-3">
            {players.length === 0 ? (
              <p className="text-white/50 text-center py-8">Waiting for players to join...</p>
            ) : (
              players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#64FFDA] to-[#38BDF8] flex items-center justify-center text-[#0A0E27] font-bold">
                      {player.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-white font-medium">{player.username}</span>
                    {player.id === user?.id && (
                      <span className="text-[#64FFDA] text-sm">(You)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {player.isReady ? (
                      <span className="text-green-400 font-semibold">✓ Ready</span>
                    ) : (
                      <span className="text-white/50">Not Ready</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <Button
            onClick={handleToggleReady}
            variant={isReady ? 'secondary' : 'primary'}
            disabled={connectionStatus !== 'connected'}
          >
            {isReady ? '✓ Ready' : 'Mark as Ready'}
          </Button>
          
          {/* Only show start button if you're the host (first player) */}
          {players.length > 0 && players[0]?.id === user?.id && (
            <Button
              onClick={handleStartGame}
              variant="primary"
              disabled={!players.every((p) => p.isReady) || players.length < 2}
            >
              Start Game
            </Button>
          )}

          <Button
            onClick={() => router.push('/dashboard')}
            variant="secondary"
          >
            Leave Lobby
          </Button>
        </div>

        {/* Info */}
        {players.length > 0 && players[0]?.id === user?.id && (
          <p className="text-white/50 text-sm mt-4">
            💡 You are the host. You can start the game when all players are ready.
          </p>
        )}
      </div>
    </div>
  );
}
