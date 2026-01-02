"use client";

import React, { useState, useRef } from "react";
import Button from "./Button";

interface TwoFaAuthenticationProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (code: string) => void;
}

function TwoFaAuthentication({ isOpen, onClose, onVerify }: TwoFaAuthenticationProps) {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  if (!isOpen) return null;

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) return;
    
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Move to previous input on backspace if current is empty
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6);
    const newCode = [...code];
    
    for (let i = 0; i < pastedData.length; i++) {
      if (/^\d$/.test(pastedData[i])) {
        newCode[i] = pastedData[i];
      }
    }
    setCode(newCode);
  };

  const handleVerify = () => {
    const fullCode = code.join("");
    if (fullCode.length === 6) {
      onVerify(fullCode);
    }
  };

  const handleResend = () => {
    setCode(["", "", "", "", "", ""]);
    inputRefs.current[0]?.focus();
    // Add your resend logic here
    console.log("Resending code...");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 max-w-sm w-full mx-4 rounded-3xl bg-[#112240] shadow-2xl border border-[#64FFDA]/30 p-10 space-y-6 animate-in fade-in zoom-in duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#8892B0] hover:text-[#64FFDA] transition-colors text-2xl"
        >
          ×
        </button>

        {/* Lock Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-[#64FFDA]/20 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-[#64FFDA]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-[#CCD6F6]">
            Enter verification code
          </h2>
          <p className="text-[#8892B0] text-sm">
            Type or paste the 6 digit code sent to your email inbox.
          </p>
        </div>

        {/* Code Input Fields */}
        <div className="flex items-center justify-center gap-2">
          {code.map((digit, index) => (
            <input
              key={index}
              ref={(el) => { inputRefs.current[index] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              className="w-12 h-14 text-center text-2xl font-bold rounded-xl bg-[#0A192F] border border-[#64FFDA]/30 text-[#CCD6F6] focus:outline-none focus:border-[#64FFDA] focus:ring-2 focus:ring-[#64FFDA]/20 transition-all"
              placeholder="•"
            />
          ))}
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          <Button
            fullWidth
            onClick={handleVerify}
          >
            Verify
          </Button>
          <Button
            fullWidth
            variant="outline"
            onClick={handleResend}
          >
            Resend code
          </Button>
        </div>
      </div>
    </div>
  );
}

export default TwoFaAuthentication;