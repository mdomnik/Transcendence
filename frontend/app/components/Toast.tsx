"use client";

import { useEffect } from "react";

interface ToastProps {
  message: string;
  onClose: () => void;
}

export default function Toast({ message, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-6 right-6 z-[9999] animate-slide-in">
      <div className="bg-red-500/90 text-white px-5 py-3 rounded-lg shadow-lg">
        {message}
      </div>
    </div>
  );
}
