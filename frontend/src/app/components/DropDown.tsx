"use client";

import { useState, useRef, useEffect } from "react";

interface DropdownItem {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
}

interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
}

export default function Dropdown({
  trigger,
  items,
  userName,
  userEmail,
  userAvatar,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-40 rounded-xl bg-[#112240] border border-[#64FFDA]/30 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in duration-150">
          {/* User Info Header (optional) */}
          {(userName || userEmail) && (
            <div className="flex items-center gap-3 p-4 border-b border-[#64FFDA]/20">
              {userAvatar ? (
                <img
                  src={userAvatar}
                  alt={userName}
                  className="w-10 h-10 rounded-full border-2 border-[#64FFDA]/50"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#64FFDA] to-[#5EEAD4] flex items-center justify-center text-[#0A192F] font-bold">
                  {userName?.charAt(0).toUpperCase() || "U"}
                </div>
              )}
              <div>
                <p className="text-[#CCD6F6] font-medium text-sm">{userName}</p>
                <p className="text-[#8892B0] text-xs">{userEmail}</p>
              </div>
            </div>
          )}

          {/* Menu Items */}
          <div className="py-2">
            {items.map((item, index) => (
              <button
                key={index}
                onClick={() => {
                  item.onClick();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-[#CCD6F6] hover:bg-[#64FFDA]/10 hover:text-[#64FFDA] transition-colors text-sm text-left"
              >
                {item.icon && <span className="w-5 h-5">{item.icon}</span>}
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}