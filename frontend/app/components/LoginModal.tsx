"use client";

import { useState } from "react";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToSignUp: () => void;
  onLoginSuccess: () => void;
}
const handleGoogleSignup = () => {
  window.location.href = "/api/auth/google/login";
};

export default function LoginModal({ isOpen, onClose, onSwitchToSignUp, onLoginSuccess }: LoginModalProps) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Send credentials to backend
      const response = await fetch('http://localhost:8080/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important: allows cookies to be sent/received
        body: JSON.stringify({ identifier, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }

      // Backend returns JWT token as httpOnly cookie
      // No need to manually store it - browser handles it automatically
      const data = await response.json();
      
      // On success, trigger 2FA or redirect
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || "Invalid email or password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 max-w-sm w-full mx-4 rounded-3xl bg-[#112240] shadow-2xl border border-[#64FFDA]/30 p-16 space-y-6 animate-in fade-in zoom-in duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#8892B0] hover:text-[#64FFDA] transition-colors text-2xl"
        >
          
        </button>

        <h2 className="text-3xl font-bold text-[#CCD6F6] text-center">Log In</h2>

        {error && (
          <div className="text-red-400 text-sm text-center bg-red-400/10 py-2 px-4 rounded-lg">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Email or Username"
            required
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-[#0A192F] border border-[#64FFDA]/30 text-[#CCD6F6] placeholder-[#8892B0] focus:outline-none focus:border-[#64FFDA] transition-colors"
          />
          <input
            type="password"
            placeholder="Password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-[#0A192F] border border-[#64FFDA]/30 text-[#CCD6F6] placeholder-[#8892B0] focus:outline-none focus:border-[#64FFDA] transition-colors"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-8 py-3 rounded-xl bg-gradient-to-r from-[#64FFDA] to-[#5EEAD4] text-[#0A192F] font-semibold shadow-lg hover:scale-105 hover:shadow-[#64FFDA]/25 transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100"
          >
            {isLoading ? "Logging in..." : "Log In"}
          </button>
        </form>

        <div className="text-center text-[#8892B0]">
          <a href="#" className="text-[#64FFDA] hover:underline text-sm">
            Forgot password?
          </a>
        </div>

        <p className="text-center text-[#8892B0]">
          Don&apos;t have an account?{" "}
          <button
            type="button"
            onClick={onSwitchToSignUp}
            className="text-[#64FFDA] hover:underline"
          >
            Sign Up
          </button>
        </p>

        <div className="flex items-center gap-4">
  		<div className="flex-1 h-px bg-[#64FFDA]/30"></div>
  		<span className="text-[#8892B0] text-sm">or</span>
 		<div className="flex-1 h-px bg-[#64FFDA]/30"></div>
		</div>

		<button
  		onClick={handleGoogleSignup}
  		className="flex items-center justify-center gap-3 w-full px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-100 transition"
		>
  		<img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
  		<span className="font-medium">Sign up with Google</span>
		</button>
      </div>
    </div>
  );
}
