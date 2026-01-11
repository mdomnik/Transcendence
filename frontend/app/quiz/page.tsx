'use client';

import { useEffect, useState } from 'react';
import { getSocket } from '../lib/socket';

export default function QuizPage() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomState, setRoomState] = useState<any>(null);

  useEffect(() => {
    const socket = getSocket();

	socket.on('connect', () => {
		console.log('Socket connected', socket.id);
	});
	socket.on('connect_error', (err) => {
		console.error('Socket connection error', err);
	});

    // Listen for room created
    socket.on('lobby:created', ({ roomId }) => {
      console.log('Room created:', roomId);
      setRoomId(roomId);
    });

    // Listen for room state
    socket.on('lobby:state', (state) => {
      console.log('Room state:', state);
      setRoomState(state);
    });

    // Optional: listen for errors
    socket.on('lobby:error', (err) => {
      console.error('Room error:', err);
    });

    return () => {
      socket.off('lobby:created');
      socket.off('lobby:state');
      socket.off('lobby:error');
    };
  }, []);

  const createRoom = () => {
    const socket = getSocket();
    console.log("is it actually working?");

    if (!socket.connected) {
		console.log('not connected');
      socket.once('connect', () => {
        socket.emit('lobby:create');
      });
    } else {
      socket.emit('lobby:create');
    }
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
