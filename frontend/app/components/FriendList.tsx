// frontend/app/components/FriendList.tsx
'use client';

import { useEffect, useState } from 'react';
import { getFriends, Friendship } from '../lib/friends';
import { useSocketConnection } from '../context/SocketContext';
import { getSocket } from '../lib/socket';

interface FriendListProps {
  refreshTrigger?: number;
}

export default function FriendList({ refreshTrigger = 0 }: FriendListProps) {
  const [friends, setFriends] = useState<Friendship[]>([]);
  const { isConnected } = useSocketConnection();

  const fetchFriends = () => getFriends().then(setFriends).catch(console.error);

  useEffect(() => {
    fetchFriends();

    if (isConnected) {
      const socket = getSocket();
      socket.on("presence:updated", fetchFriends);
      socket.on("friendship:updated", fetchFriends);

      return () => {
        socket.off("presence:updated", fetchFriends);
        socket.off("friendship:updated", fetchFriends);
      }
    }
  }, [refreshTrigger, isConnected]);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-[#64FFDA] flex items-center gap-2">
        <span>👥</span> My Friends
        {friends.length > 0 && (
          <span className="ml-auto text-sm font-normal text-[#8892B0]">
            ({friends.filter(f => f.friend.status !== 'offline').length} online / {friends.length} total)
          </span>
        )}
      </h2>
      {friends.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4 opacity-20">😔</div>
          <p className="text-[#8892B0] text-lg">No friends yet</p>
          <p className="text-[#8892B0]/60 text-sm mt-2">Start adding friends to build your network!</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-[#64FFDA]/20 scrollbar-track-transparent">
          {friends
            .sort((a, b) => {
              const priority = { 'in-game': 1, 'online': 2, 'offline': 3 };
              const statusA = (a.friend.status as any) || 'offline';
              const statusB = (b.friend.status as any) || 'offline';
              return (priority[statusA as keyof typeof priority] || 99) - (priority[statusB as keyof typeof priority] || 99);
            })
            .map((friendship) => (
            <div 
              key={friendship.id} 
              className="group p-4 bg-[#0A192F] rounded-xl border border-[#64FFDA]/10 hover:border-[#64FFDA]/30 transition-all hover:shadow-[0_0_15px_rgba(100,255,218,0.1)] flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#64FFDA] to-[#38BDF8] p-[1px] shadow-sm">
                  <div className="w-full h-full rounded-full bg-[#0A192F] flex items-center justify-center overflow-hidden">
                    {friendship.friend.avatarPath ? (
                      <img 
                        src={friendship.friend.avatarPath} 
                        alt={friendship.friend.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[#64FFDA] font-bold text-lg">
                        {friendship.friend.username.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
                <span className="font-medium text-[#CCD6F6] group-hover:text-[#64FFDA] transition-colors">
                  {friendship.friend.username}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                  friendship.friend.status === 'online' 
                    ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                    : friendship.friend.status === 'in-game'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                }`}>
                  {friendship.friend.status || 'offline'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}