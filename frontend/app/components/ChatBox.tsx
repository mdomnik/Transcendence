"use client";

import { useEffect, useState, useRef } from "react";
import { getSocket } from "../lib/socket";
import { emitWithAck } from "../lib/socketEmit";
import { Friendship } from "../lib/friends";

interface Message {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
}

interface ChatBoxProps {
  currentUser: { id: string; username: string };
  friends: Friendship[];
}

/**
 * CHATBOX COMPONENT:
 * This component handles real-time private messaging between friends.
 * It uses WebSockets for instant message delivery and manages unread counts.
 */
export default function ChatBox({ currentUser, friends }: ChatBoxProps) {
  const [activeFriendId, setActiveFriendId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeFriend = friends.find(f => f.friend.id === activeFriendId)?.friend;

  useEffect(() => {
    const socket = getSocket();
    
    /**
     * INITIALIZATION:
     * We fetch unread message counts from the backend on mount.
     */
    const fetchUnreads = async () => {
      try {
        const res = await emitWithAck(socket, "chat:unread_counts");
        if (res.ok) {
          const counts: Record<string, number> = {};
          res.data.forEach((c: any) => {
            counts[c.senderId] = c.count;
          });
          setUnreadCounts(counts);
        }
      } catch (err) {
        console.error("Failed to fetch unread counts:", err);
      }
    };
    
    fetchUnreads();

    /**
     * GLOBAL MESSAGE LISTENER:
     * This listener runs even if the chat box is closed, allowing us to
     * increment unread badges in real-time.
     */
    const handleNewMessageGlobal = (msg: Message) => {
      if (msg.senderId !== currentUser.id) {
        // If chat with this friend is not active or chatbox is closed, increment unread
        if (!isOpen || activeFriendId !== msg.senderId) {
          setUnreadCounts(prev => ({
            ...prev,
            [msg.senderId]: (prev[msg.senderId] || 0) + 1
          }));
        }
      }
    };

    socket.on("chat:receive", handleNewMessageGlobal);
    return () => {
      socket.off("chat:receive", handleNewMessageGlobal);
    };
  }, [currentUser.id, isOpen, activeFriendId]);

  useEffect(() => {
    if (!activeFriendId || !isOpen) return;

    const socket = getSocket();
    
    /**
     * MESSAGE READ STATUS:
     * When the user opens a specific chat, we notify the backend 
     * to mark those messages as 'read' in the database.
     */
    if (unreadCounts[activeFriendId]) {
      const clearUnread = async () => {
        try {
          await emitWithAck(socket, "chat:mark_read", { friendId: activeFriendId });
        } catch (err) {
          console.error("Failed to mark chat as read:", err);
        }
      };
      clearUnread();
      setUnreadCounts(prev => ({ ...prev, [activeFriendId]: 0 }));
    }

    /**
     * CHAT HISTORY:
     * Fetch the 50 most recent messages for the selected conversation.
     */
    const loadHistory = async () => {
      try {
        const res = await emitWithAck(socket, "chat:history", { friendId: activeFriendId });
        if (res.ok) {
          setMessages(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch chat history:", err);
      }
    };
    loadHistory();

    const handleNewMessage = (msg: Message) => {
      // Check if message belongs to current active chat
      if (
        (msg.senderId === activeFriendId && (msg as any).receiverId === currentUser.id) ||
        (msg.senderId === currentUser.id && (msg as any).receiverId === activeFriendId)
      ) {
        setMessages(prev => [...prev, msg]);
      }
    };

    socket.on("chat:receive", handleNewMessage);
    return () => {
      socket.off("chat:receive", handleNewMessage);
    };
  }, [activeFriendId, isOpen, currentUser.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Listen for friendship updates and clear chat if friend is removed/blocked
  useEffect(() => {
    const socket = getSocket();

    const handleFriendshipUpdate = (data: any) => {
      // When a friend is removed or blocked, clear the active chat
      if (data.type === 'CANCELED' || data.type === 'BLOCKED' || data.type === 'UNBLOCKED') {
        setMessages([]);
        setActiveFriendId(null);
        // Clear unread count for this friend when friendship changes
        if (data.otherUserId) {
          setUnreadCounts(prev => {
            const updated = { ...prev };
            delete updated[data.otherUserId];
            return updated;
          });
        }
      }
    };

    socket.on("friendship:updated", handleFriendshipUpdate);
    return () => {
      socket.off("friendship:updated", handleFriendshipUpdate);
    };
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !activeFriendId) return;

    try {
      const socket = getSocket();
      const res = await emitWithAck(socket, "chat:send", {
        receiverId: activeFriendId,
        content: inputValue,
      });

      if (res.ok) {
        setInputValue("");
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  if (!isOpen) {
    const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);
    return (
      <div 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-6 z-50 bg-[#64FFDA] text-[#0A192F] px-5 py-3 rounded-full shadow-2xl cursor-pointer hover:scale-110 transition-transform flex items-center gap-2 font-bold whitespace-nowrap"
      >
        <span className="text-xl">💬</span>
        <span className="text-sm">Friends Chat</span>
        {totalUnread > 0 && (
          <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#0A192F] animate-bounce font-bold">
            {totalUnread}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fixed bottom-20 right-6 z-50 w-full max-w-sm md:max-w-md bg-[#112240] border border-[#64FFDA]/30 rounded-2xl shadow-2xl flex flex-col h-[500px] overflow-hidden">
      {/* Header */}
      <div className="bg-[#1D2D50] p-4 border-b border-[#64FFDA]/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {activeFriend ? (
             <>
               <button onClick={() => setActiveFriendId(null)} className="text-[#64FFDA] hover:text-white">←</button>
               <div className="flex items-center gap-2">
                 <div className="w-8 h-8 rounded-full bg-[#0A192F] border border-[#64FFDA]/20 overflow-hidden">
                    {activeFriend.avatarPath ? (
                      <img src={`${activeFriend.avatarPath}?v=${Date.now()}`} alt={activeFriend.username} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-[#64FFDA]">
                        {activeFriend.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                 </div>
                 <div className="flex flex-col">
                    <span className="text-[#CCD6F6] font-bold text-sm">{activeFriend.username}</span>
                    <span className={`text-[10px] capitalize font-bold ${
                      activeFriend.status === 'in-game' ? 'text-blue-400' :
                      activeFriend.status === 'online' ? 'text-green-400' : 'text-gray-500'
                    }`}>
                      {activeFriend.status}
                    </span>
                 </div>
               </div>
             </>
          ) : (
            <span className="text-[#64FFDA] font-bold">Chat with Friends</span>
          )}
        </div>
        <button onClick={() => setIsOpen(false)} className="text-[#8892B0] hover:text-[#64FFDA] transition-colors">✕</button>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {!activeFriendId ? (
          <div className="w-full overflow-y-auto p-2 space-y-2 bg-[#0A192F]/50">
            {friends.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-[#8892B0] text-sm p-4 text-center">
                <p>No friends to chat with yet.</p>
                <p className="mt-2 text-xs">Add friends to start messaging!</p>
              </div>
            ) : (
              friends
              .sort((a, b) => {
                const priority = { 'in-game': 1, 'online': 2, 'offline': 3 };
                const statusA = (a.friend.status as any) || 'offline';
                const statusB = (b.friend.status as any) || 'offline';
                return (priority[statusA as keyof typeof priority] || 99) - (priority[statusB as keyof typeof priority] || 99);
              })
              .map(f => (
                <div 
                  key={f.id} 
                  onClick={() => setActiveFriendId(f.friend.id)}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-[#64FFDA]/10 cursor-pointer transition-colors border border-transparent hover:border-[#64FFDA]/20"
                >
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-[#112240] border border-[#64FFDA]/20 overflow-hidden">
                      {f.friend.avatarPath ? (
                        <img src={`${f.friend.avatarPath}?v=${Date.now()}`} alt={f.friend.username} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm font-bold text-[#64FFDA]">
                          {f.friend.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    { (f.friend.status === 'online' || f.friend.status === 'in-game') && (
                      <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#112240] ${
                        f.friend.status === 'in-game' ? 'bg-blue-500' : 'bg-green-500'
                      }`} />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-bold text-[#CCD6F6]">{f.friend.username}</div>
                      {unreadCounts[f.friend.id] > 0 && (
                        <div className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                          {unreadCounts[f.friend.id]}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-[#8892B0] truncate">
                      {f.friend.status === 'in-game' ? 'Currently playing' : 'Click to start chatting'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col bg-[#0A192F]/30">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-[#8892B0] text-xs">
                  No messages yet. Say hi!
                </div>
              ) : (
                messages.map(m => (
                  <div 
                    key={m.id} 
                    className={`flex ${m.senderId === currentUser.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-[13px] ${
                      m.senderId === currentUser.id 
                      ? 'bg-[#64FFDA] text-[#0A192F] rounded-br-none' 
                      : 'bg-[#112240] text-[#CCD6F6] border border-[#64FFDA]/20 rounded-bl-none'
                    }`}>
                      {m.content}
                      <div className={`text-[9px] mt-1 opacity-60 ${
                         m.senderId === currentUser.id ? 'text-[#0A192F]' : 'text-[#8892B0]'
                      }`}>
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-[#64FFDA]/20 bg-[#1D2D50]">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-[#0A192F] border border-[#64FFDA]/20 rounded-lg px-3 py-1.5 text-[13px] text-[#CCD6F6] focus:outline-none focus:border-[#64FFDA] transition-colors"
                />
                <button 
                  type="submit"
                  disabled={!inputValue.trim()}
                  className="bg-[#64FFDA] text-[#0A192F] px-3 py-1.5 rounded-lg font-bold text-xs hover:scale-105 transition-transform disabled:opacity-50 disabled:scale-100"
                >
                  Send
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
