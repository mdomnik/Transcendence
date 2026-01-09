'use client';

import { useEffect, useState } from 'react';
import { getSocket } from '../lib/socket';

export default function QuizPage() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomState, setRoomState] = useState<any>(null);

  useEffect(() => {
    const socket = getSocket();

    // Listen for room created
    socket.on('room:created', ({ roomId }) => {
      console.log('Room created:', roomId);
      setRoomId(roomId);
    });

    // Listen for room state
    socket.on('room:state', (state) => {
      console.log('Room state:', state);
      setRoomState(state);
    });

    // Optional: listen for errors
    socket.on('room:error', (err) => {
      console.error('Room error:', err);
    });

    return () => {
      socket.off('room:created');
      socket.off('room:state');
      socket.off('room:error');
    };
  }, []);

  const createRoom = () => {
    const socket = getSocket();
    socket.emit('room:create');
  };

  return (
    <div>
      <h1>Quiz Game</h1>
      <button onClick={createRoom}>Create Room</button>
      {roomId && <p>Room ID: {roomId}</p>}
      {roomState && <pre>{JSON.stringify(roomState, null, 2)}</pre>}
    </div>
  );
}
