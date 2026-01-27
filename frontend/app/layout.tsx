import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import { NotificationProvider } from "./context/NotificationContext";
import FriendRequestModal from "./components/FriendRequestModal";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Quiz Master",
  description: "Challenge your knowledge with AI-generated quizzes",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* 
           GLOBAL PROVIDERS HIERARCHY:
           1. AuthProvider: Manages user login state & JWT access tokens.
           2. SocketProvider: Maintains a single WebSocket connection for the entire app session.
           3. NotificationProvider: Listens for real-time events (chats/friend requests) and shows global toasts.
        */}
        <AuthProvider>
          <SocketProvider>
            <NotificationProvider>
              {children}
              {/* This modal is global so friend requests can be handled from any page */}
              <FriendRequestModal />
            </NotificationProvider>
          </SocketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
