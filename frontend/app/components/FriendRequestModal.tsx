'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { respondToRequest, Friendship, FriendStatus } from '../lib/friends';
import { getSocket } from '../lib/socket';

interface FriendRequestModalProps {
  onRequestHandled?: () => void;
}

/**
 * FRIEND REQUEST MODAL:
 * This is a global, interruptive modal that appears instantly whenever the user
 * receives a new friend request. It uses the global WebSocket connection 
 * to listen for incoming 'friendship:updated' events.
 */
export default function FriendRequestModal({ onRequestHandled }: FriendRequestModalProps) {
  const { user } = useAuth();
  const [pendingRequest, setPendingRequest] = useState<Friendship | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!user) return;

    const socket = getSocket();

    /**
     * REAL-TIME LISTENER:
     * This ensures the modal pops up even if the user is on the Dashboard 
     * or a different page, providing a seamless "push" experience.
     */
    const handleFriendshipUpdate = (data: any) => {
      // Show modal only for incoming requests
      if (data.type === 'REQUEST_RECEIVED') {
        setPendingRequest(data.row);
      }
    };

    socket.on('friendship:updated', handleFriendshipUpdate);

    return () => {
      socket.off('friendship:updated', handleFriendshipUpdate);
    };
  }, [user]);

  if (!pendingRequest) return null;

  const handleAccept = async () => {
    setIsProcessing(true);
    try {
      await respondToRequest(pendingRequest.id, FriendStatus.ACCEPTED);
      setPendingRequest(null);
      onRequestHandled?.();
    } catch (error) {
      console.error('Failed to accept request:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    setIsProcessing(true);
    try {
      await respondToRequest(pendingRequest.id, FriendStatus.REJECTED);
      setPendingRequest(null);
      onRequestHandled?.();
    } catch (error) {
      console.error('Failed to reject request:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const friendName = pendingRequest.friend?.username || 'Someone';
  const friendAvatar = pendingRequest.friend?.avatarPath;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[#112240] border border-[#64FFDA]/30 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-in fade-in slide-in-from-top-4 duration-300">
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-4">👋</div>
          <h2 className="text-2xl font-bold text-[#CCD6F6]">New Friend Request!</h2>
        </div>

        {/* Friend Info */}
        <div className="bg-[#0A192F] rounded-xl p-4 mb-6 border border-[#64FFDA]/10 text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#64FFDA] to-[#38BDF8] p-[2px] mx-auto mb-3">
            <div className="w-full h-full rounded-full bg-[#0A192F] flex items-center justify-center overflow-hidden">
              {friendAvatar ? (
                <img 
                  src={friendAvatar}
                  alt={friendName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-[#64FFDA] font-bold text-2xl">
                  {friendName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </div>
          <p className="text-[#CCD6F6] font-semibold text-lg">{friendName}</p>
          <p className="text-[#8892B0] text-sm mt-1">wants to be your friend</p>
        </div>

        {/* Description */}
        <p className="text-[#8892B0] text-center mb-8">
          Accept or decline this friend request to continue.
        </p>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleReject}
            disabled={isProcessing}
            className="flex-1 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-600/40 px-4 py-3 rounded-lg font-semibold transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Processing...' : 'Decline'}
          </button>
          <button
            onClick={handleAccept}
            disabled={isProcessing}
            className="flex-1 bg-green-600/20 hover:bg-green-600/30 text-green-300 border border-green-600/40 px-4 py-3 rounded-lg font-semibold transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Processing...' : 'Accept'}
          </button>
        </div>
      </div>
    </div>
  );
}
