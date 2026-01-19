"use client";

import { useState } from "react";
import Button from "./Button";

interface EditProfileModalProps {
  currentUsername: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (newUsername: string, newAvatar?: File) => Promise<void>;
}

export default function EditProfileModal({ currentUsername, isOpen, onClose, onSave }: EditProfileModalProps) {
  const [username, setUsername] = useState(currentUsername);
  const [avatarPath, setAvatar] = useState<File | undefined>(undefined);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Limit to 5MB (matching updated backend)
      if (file.size > 5 * 1024 * 1024) {
        setError("File size must be less than 5MB");
        return;
      }

      setError("");
      setAvatar(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await onSave(username, avatarPath);
      onClose();
    } catch (err) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setError((err as any).message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A192F]/80 backdrop-blur-sm">
      <div 
        className="w-full max-w-md bg-[#112240] border border-[#64FFDA]/30 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] p-8 relative animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-[#8892B0] hover:text-[#64FFDA] transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-2xl font-bold text-[#CCD6F6] mb-6 text-center">Edit Profile</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center gap-4">
            <div className={`w-24 h-24 rounded-full border-2 border-dashed flex items-center justify-center overflow-hidden ${avatarPreview ? 'border-[#64FFDA]' : 'border-[#64FFDA]/30'}`}>
              {avatarPreview ? (
                <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl text-[#64FFDA]/30">+</span>
              )}
            </div>
            <label className="cursor-pointer text-sm text-[#64FFDA] hover:underline">
              Change Avatar
              <input 
                type="file" 
                className="hidden" 
                accept="image/*"
                onChange={handleFileChange}
              />
            </label>
          </div>

          {/* Username Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#CCD6F6]">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-[#0A192F] border border-[#64FFDA]/20 text-[#CCD6F6] placeholder-[#8892B0] focus:border-[#64FFDA] focus:outline-none focus:ring-1 focus:ring-[#64FFDA] transition-all"
              placeholder="Enter your username"
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <div className="pt-2 flex gap-4">
             <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-lg border border-[#64FFDA]/30 text-[#8892B0] hover:text-[#CCD6F6] hover:border-[#64FFDA] transition-all font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-[#64FFDA] to-[#5EEAD4] text-[#0A192F] font-bold px-4 py-3 rounded-lg hover:shadow-[0_0_20px_rgba(100,255,218,0.3)] hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
