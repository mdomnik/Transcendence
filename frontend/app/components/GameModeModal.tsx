"use client";

import { useRouter } from "next/navigation";

interface GameModeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GameModeModal({ isOpen, onClose }: GameModeModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      {/* Modal Content */}
      <div className="relative w-full max-w-md bg-[#112240] rounded-2xl border border-[#64FFDA]/30 shadow-2xl overflow-hidden animate-scale-up">
        
        {/* Header */}
        <div className="p-6 text-center border-b border-[#64FFDA]/10">
          <h2 className="text-2xl font-bold text-[#CCD6F6]">Choose Game Mode</h2>
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-[#8892B0] hover:text-[#FF5555] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Options */}
        <div className="p-8 space-y-4">
          
          {/* Quick Play */}
          <button
            onClick={() => router.push("/lobby")} // Currently maps to lobby for now
            className="w-full group relative p-4 rounded-xl border border-[#64FFDA]/20 bg-[#0A192F] hover:bg-[#64FFDA]/10 transition-all duration-300"
          >
            <div className="flex items-center gap-4">
              <span className="text-3xl">🚀</span>
              <div className="text-left">
                <h3 className="text-lg font-bold text-[#64FFDA] group-hover:text-white transition-colors">Quick Play</h3>
                <p className="text-sm text-[#8892B0]">Jump into a random match</p>
              </div>
            </div>
          </button>

          {/* Multiplayer */}
          <button
            onClick={() => router.push("/lobby")}
            className="w-full group relative p-4 rounded-xl border border-[#64FFDA]/20 bg-[#0A192F] hover:bg-[#64FFDA]/10 transition-all duration-300"
          >
            <div className="flex items-center gap-4">
              <span className="text-3xl">👥</span>
              <div className="text-left">
                <h3 className="text-lg font-bold text-[#64FFDA] group-hover:text-white transition-colors">Multiplayer</h3>
                <p className="text-sm text-[#8892B0]">Challenge your friends</p>
              </div>
            </div>
          </button>

        </div>

      </div>
    </div>
  );
}
