// frontend/app/components/FriendList.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getFriends, Friendship, blockUser, unblockUser, removeFriend } from '../lib/friends';
import { useSocketConnection } from '../context/SocketContext';
import { getSocket } from '../lib/socket';

interface FriendListProps {
  refreshTrigger?: number;
}

/**
 * FRIEND LIST:
 * Displays all 'ACCEPTED' relationships and handles status updates.
 * It uses both WebSocket events for instant updates and polling as a fallback.
 */
export default function FriendList({ refreshTrigger = 0 }: FriendListProps) {
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { isConnected } = useSocketConnection();
  const router = useRouter();

  const fetchFriends = async () => {
    try {
      const friendsList = await getFriends();
      // Filter to show only accepted friendships
      const accepted = friendsList.filter(f => f.status === 'ACCEPTED');
      setFriends(accepted);
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  };

  /**
   * REAL-TIME PRESENCE:
   * We listen for 'presence:updated' events from the backend (Socket.IO).
   * When a friend goes online, offline, or enters a game, this list 
   * refreshes automatically to reflect their live status.
   */
  useEffect(() => {
    fetchFriends();

    // Polling fallback every 10 seconds since sockets are unreliable
    const pollInterval = setInterval(fetchFriends, 10000);

    if (isConnected) {
      const socket = getSocket();
      socket.on("presence:updated", fetchFriends);
      socket.on("friendship:updated", fetchFriends);
      socket.on("connect", fetchFriends);

      return () => {
        clearInterval(pollInterval);
        socket.off("presence:updated", fetchFriends);
        socket.off("friendship:updated", fetchFriends);
        socket.off("connect", fetchFriends);
      }
    }

    return () => clearInterval(pollInterval);
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
              onClick={() => router.push(`/profile/${friendship.friend.id}`)}
              className="group p-4 bg-[#0A192F] rounded-xl border border-[#64FFDA]/10 hover:border-[#64FFDA]/30 transition-all hover:shadow-[0_0_15px_rgba(100,255,218,0.1)] flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#64FFDA] to-[#38BDF8] p-[1px] shadow-sm">
                  <div className="w-full h-full rounded-full bg-[#0A192F] flex items-center justify-center overflow-hidden">
                    {friendship.friend.avatarPath ? (
                      <img 
                        src={`${friendship.friend.avatarPath}?v=${Date.now()}`} 
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
              <div className="flex items-center gap-3">
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                  friendship.friend.status === 'online' 
                    ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                    : friendship.friend.status === 'in-game'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                }`}>
                  {friendship.friend.status || 'offline'}
                </span>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRemoveFriend(friendship.id, friendship.friend.id); }}
                    disabled={actionLoading === friendship.id}
                    title="Remove friend"
                    className="p-2 hover:bg-red-600/20 text-red-300 rounded-lg transition-colors disabled:opacity-50"
                  >
                    ✕
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleBlockFriend(friendship.id, friendship.friend.id); }}
                    disabled={actionLoading === friendship.id}
                    title="Block friend"
                    className="p-2 hover:bg-orange-600/20 text-orange-300 rounded-lg transition-colors disabled:opacity-50"
                  >
                    🚫
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}