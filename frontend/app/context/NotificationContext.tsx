'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getSocket } from '../lib/socket';
import { useAuth } from './AuthContext';
import Toast from '../components/Toast';
import { getFriends } from '../lib/friends';

type ToastData = {
  message: string;
  type: 'error' | 'success' | 'info';
};

type NotificationContextType = {
  showToast: (message: string, type?: 'error' | 'success' | 'info') => void;
};

const NotificationContext = createContext<NotificationContextType>({
  showToast: () => {},
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [toast, setToast] = useState<ToastData | null>(null);

  const showToast = (message: string, type: 'error' | 'success' | 'info' = 'error') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (!user) return;
    const socket = getSocket();

    const handleFriendshipUpdate = (data: any) => {
      if (data.type === 'REQUEST_RECEIVED') {
        showToast(`Friend request from ${data.fromUsername || "someone"}`, 'info');
      }
      if (data.type === 'ACCEPTED') {
        showToast(`You are now friends with ${data.fromUsername || "someone"}!`, 'success');
      }
    };

    const handleNewMessage = (msg: any) => {
      // Don't show toast if we sent it
      if (msg.senderId !== user.id) {
         // Only show if we are NOT on a page that is already handling this chat? 
         // For now, let's just show it globally.
         showToast(`New message from ${msg.sender.username}`, 'info');
      }
    };

    socket.on("friendship:updated", handleFriendshipUpdate);
    socket.on("chat:receive", handleNewMessage);

    return () => {
      socket.off("friendship:updated", handleFriendshipUpdate);
      socket.off("chat:receive", handleNewMessage);
    };
  }, [user]);

  return (
    <NotificationContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  return useContext(NotificationContext);
}
