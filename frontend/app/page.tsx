"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import LoginModal from "./components/LoginModal";
import Button from "./components/Button";
import SignUpModal from "./components/SignUpModal";
import Dropdown from "./components/DropDown";
import FloatingShapes from "./components/FloatingShapes";
import TwoFaAuthentication from "./components/2FaAuthentication";
import { useAuth } from "./context/AuthContext";

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSignUpOpen, setIsSignUpOpen] = useState(false);
  const [is2FAOpen, setIs2FAOpen] = useState(false);

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  const handleGoogleSignup = () => {
    window.location.href = "/api/auth/google/login";
  };

  const handleLoginSuccess = () => {
    setIsLoginOpen(false);
    setIs2FAOpen(true);
  };

  const handle2FAVerify = (code: string) => {
    console.log("Verifying 2FA code:", code);
    // TODO: Call the backend to verify the code
    // On success, redirect to dashboard
    setIs2FAOpen(false);
    router.push("/dashboard");
  };

  // Show loading state while checking auth
  if (loading) {
    return (
      <main className="relative min-h-screen bg-[#0A192F] flex items-center justify-center">
        <div className="text-[#64FFDA] text-xl">Loading...</div>
      </main>
    );
  }

  // Don't show login page if authenticated (will redirect)
  if (user) {
    return null;
  }


  return (
    <main className="relative min-h-screen bg-[#0A192F] flex items-center justify-center px-6 text-center overflow-hidden">
      
      {/* Floating Animations */}
      <FloatingShapes />

      {/* Top right Login button */}
      <div className="absolute top-6 right-6 flex gap-4 items-center">
        <Button onClick={() => setIsLoginOpen(true)}>
          Sign in
        </Button>

        {/* Hamburger Menu */}
        <Dropdown
          trigger={
            <button className="flex flex-col justify-center items-center gap-1.5 p-2 rounded-lg hover:bg-[#64FFDA]/10 transition-colors">
              <span className="w-6 h-0.5 bg-[#8892B0] rounded-full"></span>
              <span className="w-6 h-0.5 bg-[#8892B0] rounded-full"></span>
              <span className="w-6 h-0.5 bg-[#8892B0] rounded-full"></span>
            </button>
          }
          items={[
            { label: "Home", onClick: () => console.log("Home") },
            { label: "About", onClick: () => console.log("About") },
            { label: "Settings", onClick: () => console.log("Settings") },
            { label: "Help", onClick: () => console.log("Help") },
          ]}
        />
      </div>

      
      {/* Glass card */}
      <div className="max-w-2xl w-full rounded-3xl bg-[#112240] backdrop-blur-xl shadow-2xl border border-[#64FFDA]/30 p-10 space-y-8">
        
        {/* Title */}
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-[#CCD6F6]">
          Welcome to
          <br />
          <span className="bg-gradient-to-r from-[#64FFDA] to-[#38BDF8] bg-clip-text text-transparent">
            AI Quiz Master
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg md:text-xl text-[#8892B0] font-medium">
          A modern multiplayer quiz experience with AI, friends, and competition.
        </p>

     

        {/* </div> */}
          <Button variant="Play" onClick={() => setIsLoginOpen(true)}>
            Play Now
          </Button>
        
      </div>

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onSwitchToSignUp={() => {
          setIsLoginOpen(false);
          setIsSignUpOpen(true);
        }}
        onLoginSuccess={handleLoginSuccess}
      />
      <SignUpModal
        isOpen={isSignUpOpen}
        onClose={() => setIsSignUpOpen(false)}
        onSwitchToLogin={() => {
          setIsSignUpOpen(false);
          setIsLoginOpen(true);
        }}
      />
      {/* 2FA Modal */}
      <TwoFaAuthentication
        isOpen={is2FAOpen}
        onClose={() => setIs2FAOpen(false)}
        onVerify={handle2FAVerify}
      />
    </main>
  );
}


