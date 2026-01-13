'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSocket } from '../lib/socket';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';

interface Player {
  userId: string;
  username: string;
  ready: boolean;
}

export default function LobbyPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [lobbyId, setLobbyId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  // Derive isReady from players list for the current user
  const isReady = players?.find(p => p.userId === user?.id)?.ready || false;

  useEffect(() => {
    const socket = getSocket();

    const handleSync = () => {
      console.log('Emitting lobby:sync...');
      socket.emit('lobby:sync', (response: any) => {
        console.log('lobby:sync response ack:', response);
        if (response && response.ok) {
           console.log('Lobby sync requested successfully, waiting for lobby:update event...');
           // We don't set state here anymore, as recommended by @mdomnik.
           // The backend will push a 'lobby:update' event to our listener below.
        } else {
          console.error('Failed to sync lobby. Response:', JSON.stringify(response));
          // If the user isn't in a lobby according to the server, return to dashboard
          if (response?.error === 'User not in a lobby') {
            router.push('/dashboard');
          } else {
            // Retry once after 2 seconds for transient errors
            setTimeout(() => {
               console.log('Retrying sync...');
               socket.emit('lobby:sync');
            }, 2000);
          }
        }
      });
    };

    // Connection events
    socket.on('connect', () => {
      console.log('Connected to lobby');
      setConnectionStatus('connected');
      handleSync();
    });

    if (socket.connected) {
      setConnectionStatus('connected');
      handleSync();
    } else {
      socket.connect();
    }

    socket.on('disconnect', () => {
      console.log('Disconnected from lobby');
      setConnectionStatus('disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setConnectionStatus('disconnected');
    });

    // Lobby events
    socket.on('lobby:update', (data: any) => {
      console.log('Lobby update received:', data);
      if (data.members) setPlayers(data.members);
      if (data.lobbyId) setLobbyId(data.lobbyId);
      if (data.ownerId) setOwnerId(data.ownerId);

      // We only redirect on state update if the game is already in progress (e.g. re-joining)
      // Otherwise we wait for the explicit 'lobby:started' event
      if (data.state === 'IN_GAME') {
         console.log('Game already in progress! Redirecting...');
         router.push('/quiz');
      }
    });

    socket.on('lobby:started', (data: any) => {
      console.log('Lobby explicitly started!', data);
      router.push('/quiz');
    });

    socket.on('lobby:deleted', () => {
      console.log('Lobby deleted');
      alert('The lobby has been disbanded.');
      router.push('/dashboard');
    });

    socket.on('lobby:kicked', () => {
      console.log('Kicked from lobby');
      alert('You have been kicked from the lobby.');
      router.push('/dashboard');
    });

    socket.on('room:error', (error: any) => {
      console.error('Lobby error:', error);
      alert(error.message || 'An error occurred');
    });

    // Cleanup on unmount
    return () => {
      if (lobbyId) {
        socket.emit('lobby:leave', { lobbyId });
      }
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('lobby:update');
      socket.off('lobby:started');
      socket.off('lobby:deleted');
      socket.off('lobby:kicked');
      socket.off('room:error');
    };
  }, [user, router, lobbyId]);

  const handleToggleReady = () => {
    if (!lobbyId) return;
    const socket = getSocket();
    const event = isReady ? 'lobby:unready' : 'lobby:ready';
    
    socket.emit(event, { lobbyId }, (response: any) => {
        if (!response?.ok) {
            console.error('Failed to update ready state');
        }
    });
  };

  const handleStartGame = () => {
    if (!lobbyId) return;
    const socket = getSocket();
    console.log('Requesting lobby:start...');
    socket.emit('lobby:start', { lobbyId }, (response: any) => {
        console.log('lobby:start response:', response);
        if (!response?.ok) {
            alert(response?.error || 'Failed to start game. Are all players ready?');
        }
    });
  };

  const handleLeaveLobby = () => {
    console.log('Leaving lobby...');
    const socket = getSocket();
    if (lobbyId) {
      socket.emit('lobby:leave', { lobbyId });
    }
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0E27] via-[#16213E] to-[#0F3460] flex items-center justify-center p-8">
      <div className="max-w-4xl w-full bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Game Lobby</h1>
          {lobbyId && (
            <p className="text-[#64FFDA]">Room ID: {lobbyId}</p>
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
            Players ({players?.length || 0})
          </h2>
          <div className="space-y-3">
            {!players || players.length === 0 ? (
              <p className="text-white/50 text-center py-8">Waiting for players to join...</p>
            ) : (
              players.map((player) => (
                <div
                  key={player.userId}
                  className="flex items-center justify-between bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#64FFDA] to-[#38BDF8] flex items-center justify-center text-[#0A0E27] font-bold">
                      {player.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-white font-medium">{player.username}</span>
                    {player.userId === user?.id && (
                      <span className="text-[#64FFDA] text-sm">(You)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {player.ready ? (
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
            variant={isReady ? 'outline' : 'primary'}
            disabled={connectionStatus !== 'connected'}
          >
            {isReady ? '✓ Ready' : 'Mark as Ready'}
          </Button>
          
          {/* Only show start button if you're the host */}
          {players && players.length > 0 && (ownerId ? ownerId === user?.id : players[0]?.userId === user?.id) && (
            <Button
              onClick={handleStartGame}
              variant="primary"
              disabled={!players || !players.every((p) => p.ready) || players.length < 1}
            >
              Start Game
            </Button>
          )}

          <Button
            onClick={handleLeaveLobby}
            variant="outline"
          >
            Leave Lobby
          </Button>
        </div>

        {/* Info */}
        {players && players.length > 0 && (ownerId ? ownerId === user?.id : players[0]?.userId === user?.id) && (
          <p className="text-white/50 text-sm mt-4">
            💡 You are the host. You can start the game when all players are ready.
          </p>
        )}
      </div>
    </div>
  );
}
