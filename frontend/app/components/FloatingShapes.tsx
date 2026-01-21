"use client";

export default function FloatingShapes() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      {/*  TRIANGLES  */}
      <div
        className="absolute left-[5%] top-[-200px] animate-float-down"
        style={{
          borderLeft: "15px solid transparent",
          borderRight: "15px solid transparent",
          borderBottom: "26px solid rgba(100, 255, 218, 0.6)",
          animationDuration: "12s",
        }}
      />
      <div
        className="absolute left-[25%] top-[-200px] animate-float-down-sway"
        style={{
          borderLeft: "12px solid transparent",
          borderRight: "12px solid transparent",
          borderBottom: "20px solid rgba(236, 72, 153, 0.5)",
          animationDuration: "15s",
          animationDelay: "2s",
        }}
      />
      <div
        className="absolute left-[55%] top-[-200px] animate-float-down-spin"
        style={{
          borderLeft: "18px solid transparent",
          borderRight: "18px solid transparent",
          borderBottom: "30px solid rgba(56, 189, 248, 0.5)",
          animationDuration: "18s",
          animationDelay: "5s",
        }}
      />
      <div
        className="absolute left-[85%] top-[-200px] animate-float-down-zigzag"
        style={{
          borderLeft: "10px solid transparent",
          borderRight: "10px solid transparent",
          borderBottom: "17px solid rgba(250, 204, 21, 0.5)",
          animationDuration: "14s",
          animationDelay: "3s",
        }}
      />

      {/*  CIRCLES  */}
      <div className="absolute left-[10%] top-[-200px] w-8 h-8 rounded-full bg-[#64FFDA]/50 animate-float-down" style={{ animationDuration: "10s", animationDelay: "1s" }} />
      <div className="absolute left-[30%] top-[-200px] w-12 h-12 rounded-full bg-pink-400/40 animate-float-down-sway" style={{ animationDuration: "16s", animationDelay: "4s" }} />
      <div className="absolute left-[50%] top-[-200px] w-6 h-6 rounded-full bg-yellow-400/50 animate-float-down-zigzag" style={{ animationDuration: "13s", animationDelay: "6s" }} />
      <div className="absolute left-[70%] top-[-200px] w-10 h-10 rounded-full bg-purple-400/40 animate-float-down-spin" style={{ animationDuration: "20s" }} />
      <div className="absolute left-[90%] top-[-200px] w-8 h-8 rounded-full bg-[#38BDF8]/50 animate-float-down" style={{ animationDuration: "11s", animationDelay: "7s" }} />

      {/*  SQUARES  */}
      <div className="absolute left-[20%] top-[-200px] w-8 h-8 bg-[#64FFDA]/40 rotate-45 animate-float-down-spin" style={{ animationDuration: "17s", animationDelay: "3s" }} />
      <div className="absolute left-[45%] top-[-200px] w-6 h-6 bg-orange-400/50 rotate-12 animate-float-down-zigzag" style={{ animationDuration: "12s", animationDelay: "8s" }} />
      <div className="absolute left-[75%] top-[-200px] w-10 h-10 bg-pink-500/30 rotate-45 animate-float-down-sway" style={{ animationDuration: "19s", animationDelay: "1s" }} />

      {/*  DIAMONDS  */}
      <div className="absolute left-[35%] top-[-200px] w-6 h-6 bg-cyan-400/50 rotate-45 animate-float-down" style={{ animationDuration: "22s", animationDelay: "5s" }} />
      <div className="absolute left-[65%] top-[-200px] w-8 h-8 bg-emerald-400/40 rotate-45 animate-float-down-spin" style={{ animationDuration: "13s", animationDelay: "9s" }} />

      {/*  STARS  */}
      <div
        className="absolute left-[40%] top-[-200px] w-10 h-10 bg-yellow-300/60 animate-float-down-zigzag"
        style={{
          clipPath:
            "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
          animationDuration: "15s",
          animationDelay: "4s",
        }}
      />
      <div
        className="absolute left-[80%] top-[-200px] w-8 h-8 bg-[#64FFDA]/60 animate-float-down"
        style={{
          clipPath:
            "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
          animationDuration: "11s",
          animationDelay: "6s",
        }}
      />

      {/*  GLOW ORBS  */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-[#64FFDA]/5 blur-3xl animate-pulse" style={{ animationDuration: "4s" }} />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full bg-[#38BDF8]/5 blur-3xl animate-pulse" style={{ animationDuration: "5s", animationDelay: "2s" }} />
    </div>
  );
}
