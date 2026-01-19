"use client";

import { useEffect } from "react";

interface ToastProps {
  message: string;
  onClose: () => void;
  type?: 'error' | 'success' | 'info';
}

export default function Toast({ message, onClose, type = 'error' }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = {
    error: 'bg-red-500/90',
    success: 'bg-green-500/90',
    info: 'bg-[#64FFDA]/90 !text-[#0A192F]',
  }[type];

  return (
    <div className="fixed top-6 right-6 z-[9999] animate-slide-in">
      <div className={`${bgColor} text-white px-3.5 py-1.5 rounded-lg shadow-lg text-xs border border-white/5`}>
        {message}
      </div>
    </div>
  );
}
