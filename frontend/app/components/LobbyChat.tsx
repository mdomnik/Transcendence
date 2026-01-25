"use client";

import { useEffect, useState, useRef } from "react";
import { getSocket } from "../lib/socket";
import { emitWithAck } from "../lib/socketEmit";

import { Friendship } from "../lib/friends";

interface Message {
  id: string;
  senderId: string;
  username?: string; // for lobby
  content: string;
  createdAt: string;
  receiverId?: string; // for DM
}

interface LobbyChatProps {
  lobbyId: string;
  currentUser: { id: string; username?: string };
  friends: Friendship[];
}

export default function LobbyChat({ lobbyId, currentUser, friends }: LobbyChatProps) {
  const [activeChat, setActiveChat] = useState<"lobby" | "list" | string>("list");
  const [lobbyMessages, setLobbyMessages] = useState<Message[]>([]);
  const [dmMessages, setDmMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({ lobby: 0 });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Force close on mount just in case
  useEffect(() => {
    setIsOpen(false);
    setActiveChat("list");
  }, []);

  const activeFriend = friends.find(f => f.friend.id === activeChat)?.friend;

  useEffect(() => {
    const socket = getSocket();

    // Fetch initial unread counts for private chats
    const fetchUnreads = async () => {
      try {
        const res = await emitWithAck(socket, "chat:unread_counts");
        if (res.ok) {
          setUnreadCounts(prev => {
            const counts = { ...prev };
            res.data.forEach((c: any) => {
              counts[c.senderId] = c.count;
            });
            return counts;
          });
        }
      } catch (err) {
        console.error("Failed to fetch unread counts:", err);
      }
    };
    
    fetchUnreads();

    // Lobby Listener
    const handleLobbyMessage = (msg: Message) => {
      setLobbyMessages((prev) => [...prev, msg]);
      if (activeChat !== "lobby" || !isOpen) {
         setUnreadCounts(prev => ({ ...prev, lobby: (prev.lobby || 0) + 1 }));
      }
    };

    // Private Chat Listener
    const handlePrivateMessage = (msg: Message) => {
      // Global unread tracking
      if (msg.senderId !== currentUser.id) {
        if (!isOpen || activeChat !== msg.senderId) {
          setUnreadCounts(prev => ({
            ...prev,
            [msg.senderId]: (prev[msg.senderId] || 0) + 1
          }));
        }
      }

      // If viewing this DM, add to messages
      if (
        (activeChat !== "lobby" && activeChat !== "list") && (
          (msg.senderId === activeChat && (msg as any).receiverId === currentUser.id) ||
          (msg.senderId === currentUser.id && (msg as any).receiverId === activeChat)
        )
      ) {
        setDmMessages(prev => [...prev, msg]);
      }
    };

    socket.on("lobby:message", handleLobbyMessage);
    socket.on("chat:receive", handlePrivateMessage);

    return () => {
      socket.off("lobby:message", handleLobbyMessage);
      socket.off("chat:receive", handlePrivateMessage);
    };
  }, [lobbyId, activeChat, isOpen, currentUser.id]);

  useEffect(() => {
    if (!isOpen) return;

    const socket = getSocket();

    const loadChatData = async () => {
      if (activeChat === "lobby") {
        setUnreadCounts(prev => ({ ...prev, lobby: 0 }));
      } else if (activeChat !== "list") {
        // Clear DM unread
        if (unreadCounts[activeChat]) {
          try {
            await emitWithAck(socket, "chat:mark_read", { friendId: activeChat });
          } catch (err) {
            console.error("Failed to mark chat as read:", err);
          }
          setUnreadCounts(prev => ({ ...prev, [activeChat]: 0 }));
        }

        // Load DM history
        try {
          const res = await emitWithAck(socket, "chat:history", { friendId: activeChat });
          if (res.ok) setDmMessages(res.data);
        } catch (err) {
          console.error("Failed to fetch chat history:", err);
        }
      }
    };

    loadChatData();
  }, [activeChat, isOpen, lobbyId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lobbyMessages, dmMessages, activeChat]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    try {
      const socket = getSocket();
      
      if (activeChat === "lobby") {
        const res = await emitWithAck(socket, "lobby:send_message", {
          lobbyId,
          content: inputValue.trim(),
        });
        if (res.ok) setInputValue("");
      } else if (activeChat !== "list") {
        const res = await emitWithAck(socket, "chat:send", {
          receiverId: activeChat,
          content: inputValue.trim(),
        });
        if (res.ok) setInputValue("");
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
        <span className="text-sm">Lobby Chat</span>
        {totalUnread > 0 && (
          <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#0A192F] animate-bounce font-bold">
            {totalUnread}
          </div>
        )}
      </div>
    );
  }

  const currentMessages = activeChat === "lobby" ? lobbyMessages : dmMessages;

  return (
    <div className="fixed bottom-20 right-6 z-50 w-full max-w-sm md:max-w-md bg-[#112240] border border-[#64FFDA]/30 rounded-2xl shadow-2xl flex flex-col h-[520px] overflow-hidden">
      {/* Header */}
      <div className="bg-[#1D2D50] p-4 border-b border-[#64FFDA]/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {activeChat !== "list" ? (
             <>
               <button onClick={() => setActiveChat("list")} className="text-[#64FFDA] hover:text-white">←</button>
               <div className="flex items-center gap-2">
                 <div className="w-8 h-8 rounded-full bg-[#0A192F] border border-[#64FFDA]/20 overflow-hidden">
                    {activeChat === "lobby" ? (
                      <div className="w-full h-full flex items-center justify-center text-[#64FFDA]">🏰</div>
                    ) : activeFriend?.avatarPath ? (
                      <img src={`${activeFriend.avatarPath}?v=${Date.now()}`} alt={activeFriend.username} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-[#64FFDA]">
                        {activeFriend?.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                 </div>
                 <div className="flex flex-col">
                    <span className="text-[#CCD6F6] font-bold text-sm truncate max-w-[150px]">
                      {activeChat === "lobby" ? "Lobby Chat" : activeFriend?.username}
                    </span>
                    {activeChat !== "lobby" && (
                      <span className={`text-[10px] capitalize font-bold ${
                        activeFriend?.status === 'in-game' ? 'text-blue-400' :
                        activeFriend?.status === 'online' ? 'text-green-400' : 'text-gray-500'
                      }`}>
                        {activeFriend?.status || 'offline'}
                      </span>
                    )}
                 </div>
               </div>
             </>
          ) : (
            <span className="text-[#64FFDA] font-bold">Select Chat</span>
          )}
        </div>
        <button onClick={() => setIsOpen(false)} className="text-[#8892B0] hover:text-[#64FFDA] transition-colors">✕</button>
      </div>

      <div className="flex-1 flex flex-col bg-[#0A192F]/30 overflow-hidden">
        {activeChat === "list" ? (
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {/* Lobby Option */}
            <div 
              onClick={() => setActiveChat("lobby")}
              className="flex items-center gap-3 p-2 rounded-xl hover:bg-[#64FFDA]/10 cursor-pointer transition-colors border border-transparent hover:border-[#64FFDA]/20"
            >
              <div className="w-10 h-10 rounded-full bg-[#64FFDA]/20 flex items-center justify-center text-[#64FFDA]">🏰</div>
              <div className="flex-1">
                <div className="flex justify-between items-center">
                   <div className="text-sm font-bold text-[#CCD6F6]">Lobby Room</div>
                   {unreadCounts.lobby > 0 && (
                     <div className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">{unreadCounts.lobby}</div>
                   )}
                </div>
                <div className="text-xs text-[#8892B0]">Chat with everyone here</div>
              </div>
            </div>

            <div className="border-t border-[#64FFDA]/10 my-1 pt-1 ml-2 text-[10px] text-[#8892B0] uppercase font-bold tracking-widest">Friends</div>
            
            {friends.map(f => (
              <div 
                key={f.id}
                onClick={() => setActiveChat(f.friend.id)}
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
                  {(f.friend.status === 'online' || f.friend.status === 'in-game') && (
                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#112240] ${f.friend.status === 'in-game' ? 'bg-blue-500' : 'bg-green-500'}`} />
                  )}
                </div>
                <div className="flex-1">
                   <div className="flex justify-between items-center">
                     <div className="text-sm font-bold text-[#CCD6F6]">{f.friend.username}</div>
                     {unreadCounts[f.friend.id] > 0 && (
                        <div className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">{unreadCounts[f.friend.id]}</div>
                     )}
                   </div>
                   <div className="text-xs text-[#8892B0] capitalize">{f.friend.status}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {currentMessages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-[#8892B0] text-xs font-medium">No messages yet. Say hi!</div>
              ) : (
                currentMessages.map((m, idx) => (
                  <div key={m.id || idx} className={`flex flex-col ${m.senderId === currentUser.id ? 'items-end' : 'items-start'}`}>
                    {(activeChat === "lobby" && m.senderId !== currentUser.id) && (
                      <span className="text-[10px] text-[#8892B0] px-1 mb-1 font-bold">{m.username || 'User'}</span>
                    )}
                    <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-[13px] ${
                      m.senderId === currentUser.id 
                      ? 'bg-[#64FFDA] text-[#0A192F] rounded-br-none' 
                      : 'bg-[#112240] text-[#CCD6F6] border border-[#64FFDA]/20 rounded-bl-none'
                    }`}>
                      {m.content}
                      <div className={`text-[9px] mt-1 opacity-60 ${m.senderId === currentUser.id ? 'text-[#0A192F]' : 'text-[#8892B0]'}`}>
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

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
                  className="bg-[#64FFDA] text-[#0A192F] px-3 py-1.5 rounded-lg font-bold text-xs hover:scale-105 transition-transform disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
