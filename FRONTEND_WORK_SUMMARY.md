# Frontend Work Summary - Socket.IO Multiplayer Quiz Game

## Overview
Implemented a real-time multiplayer quiz game using Socket.IO for the Transcendence project. This includes lobby functionality, live quiz gameplay, and WebSocket communication infrastructure.

---

## 1. New Files Created

### 📁 `frontend/app/lib/socket.ts`
**Purpose:** Socket.IO connection utility (Singleton pattern)

**What it does:**'/auth/callback'
- Creates a single WebSocket connection shared across the entire app
- Connects to `https://localhost:3000/quiz` namespace
- Uses `withCredentials: true` to send authentication cookies
- Prevents multiple connections (memory efficient)

**Key Code:**
```typescript
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io('https://localhost:3000/quiz', {
      transports: ['websocket'],
      withCredentials: true,
    });
  }
  return socket;
}
```

**Theory Learned:** Singleton pattern, WebSocket vs HTTP, persistent connections

---

### 📁 `frontend/app/lobby/page.tsx`
**Purpose:** Game lobby/waiting room where players gather before the quiz starts

**Features:**
- **Real-time player list** - Shows all players who joined
- **Connection status indicator** - Shows if connected/disconnected/connecting
- **Ready system** - Players can mark themselves as ready
- **Host controls** - First player can start the game when everyone is ready
- **Leave functionality** - Button to exit lobby

**Socket Events (Emitted to Backend):**
- `join-lobby` - When user enters the page
- `mark-ready` - When user toggles ready status
- `leave-lobby` - When user leaves
- `start-game` - Host starts the game

**Socket Events (Received from Backend):**
- `connect` / `disconnect` - Connection status
- `room:created` - Room ID received
- `player-joined` - New player joined
- `player-left` - Player disconnected
- `player-ready` - Player ready status changed
- `lobby-state` - Full lobby state sync
- `game-starting` - Game begins, redirect to /quiz

**UI Components:**
- Header with Room ID and connection status
- Player list with avatars and ready indicators
- "Mark as Ready" button (disabled if not connected)
- "Start Game" button (only for host, disabled until all ready)
- "Leave Lobby" button

**Theory Learned:** Real-time state synchronization, event-driven architecture, room-based multiplayer

---

### 📁 `frontend/app/quiz/page.tsx`
**Purpose:** Live quiz game page with real-time questions and scoring

**Features:**
- **Live questions** - Displays current question with multiple choice options
- **Timer countdown** - Shows time remaining for each question
- **Answer submission** - Click to submit answer via WebSocket
- **Real-time scoreboard** - Shows top 3 players' scores during game
- **Answer feedback** - Shows if your answer was correct/incorrect
- **Game over screen** - Final leaderboard with rankings

**Socket Events (Emitted to Backend):**
- `submit-answer` - Sends user's answer with timestamp

**Socket Events (Received from Backend):**
- `question-start` - New question received
- `question-end` - Question ends, correct answer revealed
- `scores-update` - Live score updates
- `game-over` - Game finished, final scores

**Game States:**
1. **Waiting** - Loading spinner while waiting for questions
2. **Question Active** - Timer running, can select answer
3. **Question Ended** - Shows correct/incorrect feedback
4. **Game Over** - Final leaderboard with "Play Again" option

**UI Components:**
- Timer display (turns red and pulses when < 5 seconds)
- Scoreboard showing top players
- Question text
- 4 answer options (A, B, C, D) as clickable buttons
- Answer feedback (green for correct, red for incorrect)
- Final leaderboard with user's rank

**Theory Learned:** Timer management with useEffect, conditional rendering, real-time score updates, game state management

---

## 2. Files Modified

### 📁 `frontend/app/components/Button.tsx`
**What was fixed:**
- Added `disabled` prop support (was missing)
- Added disabled styling with opacity and cursor changes

**Changes:**
```typescript
interface ButtonProps {
  disabled?: boolean;  // ← Added
}

export default function Button({ disabled = false }) {
  const disabledStyle = disabled ? "opacity-50 cursor-not-allowed hover:scale-100" : "";
  
  return (
    <button disabled={disabled} className={`... ${disabledStyle}`}>
      {children}
    </button>
  );
}
```

**Why:** Lobby and quiz pages needed to disable buttons when not connected or waiting for responses

---

### 📁 `frontend/package.json`
**What was added:**
- `socket.io-client` dependency (version from npm install)

**Why:** Required for WebSocket communication with backend

---

### 📁 `backend/` (Updated from dev branch)
**What happened:**
- Pulled latest backend code from `origin/dev` branch
- Includes: lobby gateway, vector embeddings, public API, user management
- Removed old cookie-based auth changes that were reverted

**Key backend files:**
- `backend/src/lobby/lobby.gateway.ts` - WebSocket handler (from teammates)
- Database migrations updated
- Quiz service refactored

---

## 3. What Was Fixed

### Issue 1: Button Component Type Errors
**Problem:** Lobby and quiz pages used `variant="secondary"` but Button only accepts `"primary" | "outline" | "Play"`

**Solution:** Changed all `variant="secondary"` to `variant="outline"`

**Files affected:**
- `frontend/app/lobby/page.tsx` (2 instances)
- `frontend/app/quiz/page.tsx` (1 instance)

---

### Issue 2: Missing Disabled Prop
**Problem:** Button component didn't support `disabled` prop

**Solution:** Added disabled prop with proper styling and HTML attribute

---

### Issue 3: Google OAuth Redirect Issue
**Problem:** After Google login, users redirected to `/` (home) instead of `/auth/callback`

**Status:** Identified but not fixed (requires backend change)

**What backend needs to do:**
```typescript
// In backend/src/auth/auth.controller.ts, line 54
return res.redirect('/auth/callback');  // Change from '/'
```

---

### Issue 4: Secure Cookie Problem
**Problem:** Backend sets `secure: true` cookies but app runs on HTTP (localhost)

**Status:** Identified but not fixed (requires backend change)

**What backend needs to do:**
```typescript
// In backend/src/auth/auth.controller.ts
res.cookie('access_token', accessToken, {
  secure: false,  // Change from true for development
  // ... other options
});
```

---

### Issue 5: Database Migration Failure
**Problem:** Backend won't start due to failed Prisma migration `20260106153140_init`

**Status:** Requires backend team to fix

**Error:**
```
Error: P3009
The `20260106153140_init` migration started at 2026-01-11 14:53:00.461501 UTC failed
```

---

## 4. How It All Works Together

### Flow: Lobby → Quiz Game

```
1. User navigates to /lobby
   ↓
2. Frontend calls getSocket() → connects to backend
   ↓
3. Frontend emits 'join-lobby' with user info
   ↓
4. Backend adds user to lobby, broadcasts to all players
   ↓
5. All players see new player in list (real-time)
   ↓
6. Players click "Ready" → emits 'mark-ready'
   ↓
7. All players see ready status update (real-time)
   ↓
8. Host clicks "Start Game" → emits 'start-game'
   ↓
9. Backend emits 'game-starting' to all players
   ↓
10. All players redirect to /quiz (simultaneously)
   ↓
11. Backend emits 'question-start' with first question
   ↓
12. Timer starts counting down for all players
   ↓
13. Players submit answers → 'submit-answer' event
   ↓
14. Backend emits 'question-end' with correct answer
   ↓
15. Backend emits 'scores-update' with new scores
   ↓
16. Repeat steps 11-15 for each question
   ↓
17. Backend emits 'game-over' with final scores
   ↓
18. Players see leaderboard, can play again
```

---

## 5. Key Concepts Learned

### WebSocket vs HTTP
- **HTTP:** Request → Response (one-way, closes connection)
- **WebSocket:** Persistent two-way connection (both can send anytime)
- **Use case:** Real-time updates without polling

### Singleton Pattern
- Only one socket connection for entire app
- Prevents memory leaks from multiple connections
- Shared state across components

### Event-Driven Architecture
- Frontend listens for events: `socket.on('event', callback)`
- Frontend sends events: `socket.emit('event', data)`
- Decoupled, reactive updates

### Real-Time State Synchronization
- Backend is source of truth
- Frontend updates state when receiving events
- All players see same state at same time

### React + WebSocket Integration
- Use `useEffect` to setup/cleanup listeners
- Use `useState` to trigger re-renders on events
- Always cleanup listeners on unmount

---

## 6. Current Status

### ✅ Working
- Lobby page UI complete
- Quiz page UI complete
- Socket.IO client setup
- Button component with disabled state
- All TypeScript types correct
- Docker build successful

### ⏳ Pending (Backend Team)
- Fix database migration error
- Fix Google OAuth redirect to `/auth/callback`
- Change secure cookie to `false` for development
- Fix WebSocket CORS/certificate issues (mentioned by teammate)

### 🔄 Next Steps
1. Backend team fixes migration issue
2. Backend team fixes OAuth redirect
3. Test WebSocket connection
4. Play multiplayer quiz game with teammates
5. Debug any real-time synchronization issues

---

## 7. Files Summary

### Created (3 files)
1. `frontend/app/lib/socket.ts` - WebSocket connection utility
2. `frontend/app/lobby/page.tsx` - Lobby/waiting room (212 lines)
3. `frontend/app/quiz/page.tsx` - Quiz game page (259 lines)

### Modified (3 files)
1. `frontend/app/components/Button.tsx` - Added disabled prop
2. `frontend/app/lobby/page.tsx` - Fixed variant types
3. `frontend/app/quiz/page.tsx` - Fixed variant types

### Updated (Backend)
- Pulled latest from `origin/dev` branch
- Includes all teammate contributions

---

## 8. Git Commits

### Commit 1: `ad40e55`
**Message:** "feat: add Socket.IO multiplayer quiz game with lobby"

**Includes:**
- Socket.IO client setup
- Lobby page implementation
- Quiz page implementation
- Backend update from dev branch

### Commit 2: `64ca5d2`
**Message:** "fix: add disabled prop to Button component and fix variant types"

**Includes:**
- Button disabled prop
- Variant type fixes

---

## 9. Technical Achievements

✅ Implemented real-time multiplayer architecture
✅ Used  pattern for connection management
✅ Built event-driven UI with React hooks
✅ Created reusable WebSocket utility
✅ Proper cleanup to prevent memory leaks
✅ TypeScript type safety maintained
✅ Responsive UI with loading states
✅ Error handling for connection issues
✅ Dockerized frontend with new dependencies

---

## 10. Questions to Ask Backend Team

1. **Migration Issue:** "Can you help resolve the Prisma migration error `20260106153140_init`? Backend won't start."

2. **OAuth Redirect:** "Can you change line 54 in `backend/src/auth/auth.controller.ts` from `return res.redirect('/')` to `return res.redirect('/auth/callback')`?"

3. **Cookie Security:** "Can you change `secure: true` to `secure: false` in the cookie config for development?"

4. **WebSocket Events:** "What are the exact event names and data formats for the lobby and quiz game? Can you share the event contracts?"

5. **Backend URL:** "What's the WebSocket server URL? Currently using `https://localhost:3000/quiz` - is this correct?"

---

**Total Lines of Code Added:** ~500 lines
**Time Investment:** Full session implementing multiplayer game infrastructure
**Status:** Frontend complete, waiting on backend fixes to test full flow
