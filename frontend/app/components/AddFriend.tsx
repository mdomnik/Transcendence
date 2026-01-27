// frontend/app/components/AddFriend.tsx
'use client';

import { useState } from 'react';
import { sendFriendRequest } from '../lib/friends';
import { searchUsers } from '../lib/profile';

interface AddFriendProps {
  onAction?: () => void;
}

/**
 * ADD FRIEND:
 * Provides a searchable interface to find users by username and initiate 
 * a friendship relation. It combines searching and request-sending logic.
 */
export default function AddFriend({ onAction }: AddFriendProps) {
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      /**
       * PROCESS:
       * 1. SEARCH: We first search for the user by their text username.
       * 2. ID MATCH: We find the specific user ID from the search results.
       * 3. REQUEST: We send the request using the target user's UUID.
       */
      const results = await searchUsers(username);
      const target = results.find((u: any) => u.username.toLowerCase() === username.toLowerCase());
      
      if (!target) {
        setMessage(`Error: User "${username}" not found.`);
        return;
      }

      const result = await sendFriendRequest(target.id);
      if (!result.ok) {
        setMessage(`Error: ${result.error}`);
        return;
      }
      
      setMessage(`Request sent to ${target.username}!`);
      setUsername('');
      
      if (onAction) onAction();
    } catch (error) {
      setMessage('Error: Could not send request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 className="text-xl font-bold mb-4 text-[#64FFDA] flex items-center gap-2">
        <span>➕</span> Add Friend
      </h3>
      <form onSubmit={handleAdd} className="space-y-3">
        <input
          type="text"
          placeholder="Enter username..."
          className="w-full px-4 py-3 rounded-lg bg-[#0A192F] border border-[#64FFDA]/20 text-[#CCD6F6] placeholder-[#8892B0] focus:border-[#64FFDA] focus:outline-none focus:ring-2 focus:ring-[#64FFDA]/20 transition-all"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-gradient-to-r from-[#64FFDA] to-[#5EEAD4] text-[#0A192F] font-bold px-6 py-3 rounded-lg hover:shadow-[0_0_20px_rgba(100,255,218,0.3)] hover:scale-[1.02] transition-all duration-300 disabled:opacity-50"
        >
          {loading ? 'Sending...' : 'Send Request'}
        </button>
      </form>
      {message && (
        <div className={`mt-3 p-3 rounded-lg text-sm ${
          message.includes('Error') 
            ? 'bg-red-900/20 border border-red-500/30 text-red-300' 
            : 'bg-green-900/20 border border-green-500/30 text-green-300'
        }`}>
          {message}
        </div>
      )}
    </div>
  );
}