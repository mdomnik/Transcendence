'use client';

import { useEffect, useState } from 'react';
import { getBlockedUsers, Friendship, unblockUser } from '../lib/friends';
import { useSocketConnection } from '../context/SocketContext';
import { getSocket } from '../lib/socket';

interface BlockedUsersProps {
  refreshTrigger?: number;
}

export default function BlockedUsers({ refreshTrigger = 0 }: BlockedUsersProps) {
  const [blockedUsers, setBlockedUsers] = useState<Friendship[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { isConnected } = useSocketConnection();

  const fetchBlockedUsers = async () => {
    try {
      const blocked = await getBlockedUsers();
      console.log('[BlockedUsers] Fetched:', blocked);
      // Only show users that we blocked (where we are the blocker)
      const ourBlocks = blocked.filter(f => f.isBlocker);
      console.log('[BlockedUsers] Our blocks:', ourBlocks);
      setBlockedUsers(ourBlocks);
    } catch (error) {
      console.error('Error fetching blocked users:', error);
    }
  };

  const handleUnblockFriend = async (friendshipId: string, userId: string) => {
    setActionLoading(friendshipId);
    try {
      await unblockUser(userId);
      fetchBlockedUsers();
    } catch (error) {
      console.error('Failed to unblock user:', error);
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    fetchBlockedUsers();

    if (isConnected) {
      const socket = getSocket();
      
      // Refresh on ANY friendship update - all events should trigger a refresh
      const handleFriendshipUpdate = () => {
        fetchBlockedUsers();
      };

      socket.on("friendship:updated", handleFriendshipUpdate);

      return () => {
        socket.off("friendship:updated", handleFriendshipUpdate);
      }
    }
  }, [refreshTrigger, isConnected]);

  if (blockedUsers.length === 0) {
    return (
      <div className="text-center py-8 text-[#8892B0]">
        <p className="text-sm">No blocked users</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-[#64FFDA]/20 scrollbar-track-transparent">
      {blockedUsers.map((friendship) => (
        <div 
          key={friendship.id} 
          className="group p-4 bg-[#0A192F] rounded-xl border border-red-500/20 hover:border-red-500/40 transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-600 to-red-400 p-[1px]">
              <div className="w-full h-full rounded-full bg-[#0A192F] flex items-center justify-center overflow-hidden">
                {friendship.friend.avatarPath ? (
                  <img 
                    src={friendship.friend.avatarPath} 
                    alt={friendship.friend.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-red-400 font-bold text-lg">
                    {friendship.friend.username.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            </div>
            <div>
              <span className="font-medium text-[#CCD6F6]">
                {friendship.friend.username}
              </span>
              <p className="text-xs text-red-400/70">Blocked</p>
            </div>
          </div>
          <button
            onClick={() => handleUnblockFriend(friendship.id, friendship.friend.id)}
            disabled={actionLoading === friendship.id}
            title="Unblock user"
            className="px-3 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-300 rounded-lg transition-colors disabled:opacity-50 text-sm font-medium"
          >
            Unblock
          </button>
        </div>
      ))}
    </div>
  );
}
