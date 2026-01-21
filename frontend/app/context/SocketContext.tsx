'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getSocket } from '../lib/socket';
import { useAuth } from './AuthContext';

type SocketContextType = {
  isConnected: boolean;
};

const SocketContext = createContext<SocketContextType>({ isConnected: false });

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (user) {
      const socket = getSocket();
      
      const onConnect = () => setIsConnected(true);
      const onDisconnect = () => setIsConnected(false);

      socket.on('connect', onConnect);
      socket.on('disconnect', onDisconnect);

      if (!socket.connected) {
        console.log('[SocketProvider] Connecting...');
        socket.connect();
      } else {
        setIsConnected(true);
      }

      return () => {
        socket.off('connect', onConnect);
        socket.off('disconnect', onDisconnect);
      };
    } else {
      const socket = getSocket();
      if (socket.connected) {
        socket.disconnect();
      }
      setIsConnected(false);
    }
  }, [user]);

  return (
    <SocketContext.Provider value={{ isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocketConnection() {
  return useContext(SocketContext);
}
