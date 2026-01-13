// frontend/app/components/FriendRequests.tsx
'use client';

import { useEffect, useState } from 'react';
import { getFriendRequests, respondToRequest, Friendship, FriendStatus } from '../lib/friends';

export default function FriendRequests() {
  const [requests, setRequests] = useState<Friendship[]>([]);

  const refreshRequests = () => {
    getFriendRequests().then(setRequests);
  };

  useEffect(() => {
    refreshRequests();
  }, []);

  const handleResponse = async (id: string, status: FriendStatus.ACCEPTED | FriendStatus.REJECTED) => {
    try {
      await respondToRequest(id, status);
      // Remove the handled request from the list
      setRequests((prev) => prev.filter((req) => req.id !== id));
      // Ideally, if accepted, we should refresh the FriendList too
    } catch (error) {
      alert('Failed to update request');
    }
  };

  return (
    <div>
      <h3 className="text-xl font-bold mb-4 text-[#64FFDA] flex items-center gap-2">
        <span>📬</span> Friend Requests
        {requests.length > 0 && (
          <span className="ml-2 text-xs bg-[#64FFDA] text-[#0A192F] px-2 py-1 rounded-full font-bold">
            {requests.length}
          </span>
        )}
      </h3>
      
      {requests.length === 0 ? (
        <div className="text-center py-10">
          <div className="text-4xl mb-3 opacity-20">✅</div>
          <p className="text-[#8892B0] text-sm">No pending requests</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-[#64FFDA]/20 scrollbar-track-transparent">
          {requests.map((req) => (
            <div key={req.id} className="p-4 bg-[#0A192F] border border-[#64FFDA]/20 rounded-xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#64FFDA] to-[#38BDF8] flex items-center justify-center text-[#0A192F] font-bold text-sm">
                  {req.friend.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-[#CCD6F6] font-medium">{req.friend.username}</p>
                  <p className="text-[#8892B0] text-xs">wants to be friends</p>
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
  );
}