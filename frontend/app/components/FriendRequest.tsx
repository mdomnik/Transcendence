// frontend/app/components/FriendRequests.tsx
'use client';

import { useEffect, useState } from 'react';
import { getFriendRequests, respondToRequest, cancelFriendRequest, Friendship, FriendStatus } from '../lib/friends';
import { useSocketConnection } from '../context/SocketContext';
import { getSocket } from "../lib/socket";

interface FriendRequestsProps {
  onAction?: () => void;
  refreshTrigger?: number;
}

export default function FriendRequests({ onAction, refreshTrigger = 0 }: FriendRequestsProps) {
  const [requests, setRequests] = useState<Friendship[]>([]);
  const { isConnected } = useSocketConnection();

  const refreshRequests = async () => {
    try {
      const allRequests = await getFriendRequests();
      setRequests(allRequests);
    } catch (error) {
      console.error('Error fetching requests:', error);
    }
  };

  useEffect(() => {
    refreshRequests();

    // Polling fallback to keep list updated
    const pollInterval = setInterval(refreshRequests, 10000);

    if (isConnected) {
      const socket = getSocket();
      
      // Refresh requests on ANY friendship update - all events should trigger a refresh
      const handleFriendshipUpdate = () => {
        refreshRequests();
      };

      socket.on("friendship:updated", refreshRequests);

      return () => {
        clearInterval(pollInterval);
        socket.off("friendship:updated", refreshRequests);
      };
    }
    return () => clearInterval(pollInterval);
  }, [isConnected, refreshTrigger]);

  // Filter to show incoming and outgoing requests
  const incomingRequests = (requests as any[]).filter(req => !req.isRequester);
  const outgoingRequests = (requests as any[]).filter(req => req.isRequester);

  const handleResponse = async (id: string, status: FriendStatus.ACCEPTED | FriendStatus.REJECTED) => {
    try {
      await respondToRequest(id, status);
      // Remove the handled request from the list
      setRequests((prev) => prev.filter((req) => req.id !== id));
      
      // If we accepted, trigger refresh of the parent/FriendList
      if (status === FriendStatus.ACCEPTED && onAction) {
        onAction();
      }
    } catch (error) {
      alert('Failed to update request');
    }
  };

  const handleCancel = async (userId: string) => {
    try {
      await cancelFriendRequest(userId);
      setRequests((prev) => prev.filter((req) => req.friend.id !== userId));
    } catch (error) {
      alert('Failed to cancel request');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-bold mb-4 text-[#64FFDA] flex items-center gap-2">
          <span>📬</span> Friend Requests
          {incomingRequests.length > 0 && (
            <span className="ml-2 text-xs bg-[#64FFDA] text-[#0A192F] px-2 py-1 rounded-full font-bold">
              {incomingRequests.length}
            </span>
          )}
        </h3>
        
        {incomingRequests.length === 0 ? (
          <div className="text-center py-6 bg-[#0A192F]/40 rounded-xl border border-[#64FFDA]/5">
            <p className="text-[#8892B0] text-sm italic">No pending invitations</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-[#64FFDA]/20 scrollbar-track-transparent">
            {incomingRequests.map((req) => (
              <div key={req.id} className="p-4 bg-[#0A192F] border border-[#64FFDA]/20 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#64FFDA] to-[#38BDF8] p-[1px]">
                    <div className="w-full h-full rounded-full bg-[#0A192F] flex items-center justify-center overflow-hidden">
                      {req.friend.avatarPath ? (
                        <img 
                          src={`${req.friend.avatarPath}?v=${Date.now()}`}
                          alt={req.friend.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-[#64FFDA] font-bold text-sm">
                          {req.friend.username.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-[#CCD6F6] font-medium">{req.friend.username}</p>
                    <p className="text-[#8892B0] text-xs">wants to connect</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleResponse(req.id, FriendStatus.ACCEPTED)}
                    className="flex-1 bg-green-600/20 hover:bg-green-600/30 text-green-300 border border-green-600/40 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-[1.02]"
                  >
                    ✓ Accept
                  </button>
                  <button 
                    onClick={() => handleResponse(req.id, FriendStatus.REJECTED)}
                    className="flex-1 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-600/40 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-[1.02]"
                  >
                    ✕ Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {outgoingRequests.length > 0 && (
        <div>
          <h3 className="text-xl font-bold mb-4 text-[#8892B0] flex items-center gap-2">
            <span>📤</span> Sent Invitations
          </h3>
          <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-[#8892B0]/20 scrollbar-track-transparent">
            {outgoingRequests.map((req) => (
              <div key={req.id} className="p-3 bg-[#0A192F]/40 border border-[#8892B0]/10 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#112240] flex items-center justify-center overflow-hidden border border-[#8892B0]/20">
                    {req.friend.avatarPath ? (
                      <img src={`${req.friend.avatarPath}?v=${Date.now()}`} alt={req.friend.username} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[#8892B0] text-xs font-bold">{req.friend.username.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div>
                    <p className="text-[#CCD6F6] text-sm font-medium">{req.friend.username}</p>
                    <p className="text-[#8892B0] text-[10px] uppercase tracking-wider">Requested</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleCancel(req.friend.id)}
                  className="text-red-400/60 hover:text-red-400 text-xs px-3 py-1.5 transition-colors border border-transparent hover:border-red-400/20 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}