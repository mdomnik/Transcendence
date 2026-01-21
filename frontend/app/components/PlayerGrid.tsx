"use client";

import React from "react";

interface Player {
  userId: string;
  username: string;
}

interface Props {
  players: Player[];
  submittedBy: string[];
  onQuit: () => void;
}

export const PlayersGrid: React.FC<Props> = ({
  players,
  submittedBy,
  onQuit,
}) => {
  return (
    <div className="relative w-full h-full">
      {/* Quit Game Button */}
      <button
        onClick={onQuit}
        className="absolute top-4 left-4 z-50 rounded-lg
                   border border-red-500/40 bg-red-500/10
                   px-4 py-2 text-sm font-medium text-red-400
                   hover:bg-red-500/20 transition"
      >
        Quit Game
      </button>

      {/* Players Grid */}
      <div className="grid grid-cols-2 gap-6 p-6 pt-16">
        {players.map((p) => {
          const hasSubmitted = submittedBy.includes(p.userId);

          return (
            <div
              key={p.userId}
              className={`rounded-xl border p-6 flex items-center justify-center text-lg transition ${
                hasSubmitted
                  ? "border-[#64FFDA]/40 bg-[#64FFDA]/10"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <span className="flex items-center gap-2">
                {p.username}
                <span className="text-sm opacity-70">
                  {hasSubmitted ? "✓ Submitted" : "… Waiting"}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
