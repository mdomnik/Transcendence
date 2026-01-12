"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import FloatingShapes from "../components/FloatingShapes";
import AddFriend from "../components/AddFriend";
import FriendList from "../components/FriendList";
import FriendRequests from "../components/FriendRequest";
import { useAuth } from "../context/AuthContext";

export default function FriendsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <main className="relative min-h-screen bg-[#0A192F] flex items-center justify-center">
        <div className="text-[#64FFDA] text-xl">Loading...</div>
      </main>
    );
  }

  if (!user) return null;

  return (
    <main className="relative min-h-screen bg-[#0A192F] overflow-hidden">
      <FloatingShapes />

      {/* Header */}
      <header className="relative z-20 flex items-center justify-between px-6 py-4 border-b border-[#64FFDA]/20">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-[#64FFDA] hover:text-[#5EEAD4] transition-colors"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[#64FFDA] to-[#38BDF8] bg-clip-text text-transparent">
            Friends
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-6 py-10">
        
        <div className="max-w-6xl mx-auto">
          
          {/* Page Title */}
          <div className="text-center mb-12">
            <div className="text-6xl mb-4">👥</div>
            <h2 className="text-4xl font-extrabold text-[#CCD6F6] mb-3">
              Social Hub
            </h2>
            <p className="text-[#8892B0] text-lg">
              Connect with players and build your gaming network
            </p>
          </div>

          {/* Social Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column: Add Friend & Requests */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Add Friend */}
              <div className="bg-[#112240]/80 backdrop-blur rounded-2xl p-6 border border-[#64FFDA]/10">
                <AddFriend />
              </div>

              {/* Friend Requests */}
              <div className="bg-[#112240]/80 backdrop-blur rounded-2xl p-6 border border-[#64FFDA]/10 min-h-[300px]">
                <FriendRequests />
              </div>
              
            </div>

            {/* Right Column: Friends List */}
            <div className="lg:col-span-7">
              <div className="bg-[#112240]/80 backdrop-blur rounded-2xl p-8 border border-[#64FFDA]/10 min-h-[600px]">
                <FriendList />
              </div>
            </div>

          </div>

        </div>

      </div>
    </main>
  );
}
