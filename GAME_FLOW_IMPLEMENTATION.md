# Game Flow Implementation Guide

## Summary of Changes Made

### 1. Fixed Match History Structure
**File:** `frontend/app/lib/profile.ts`
- Changed `MatchHistory` interface to match backend `GameResult` schema
- Updated from opponent-based to topic-based history
- Changed fields: `opponent` → `topic`, `score: string` → `score: number`, `date` → `playedAt`

**File:** `frontend/app/profile/page.tsx`
- Updated table to display: Topic, Score, Win/Loss, Date
- Removed "Opponent" and "Type" columns
- Added proper date formatting

### 2. Game Flow Implementation

Created `/frontend/app/game/page.tsx` with multi-stage flow:

**Stages:**
1. **topic-input**: Solo player inputs topic
2. **waiting-topics**: Wait for all players
3. **topic-voting**: All players vote on submitted topics
4. **waiting-votes**: Wait for all votes
5. **topic-selected**: Show winning topic (3s display)
6. **question**: Present question with timer
7. **question-result**: Show if answer was correct + current scores
8. **game-over**: Final leaderboard

## Next Steps - Backend Integration

### Backend Events You Need to Emit/Listen:

**From Frontend → Backend:**
```typescript
socket.emit('game:submit-topic', { topic: string });
socket.emit('game:vote-topic', { topicId: string });
socket.emit('game:submit-answer', { 
  questionId: string, 
  answer: number,
  timeLeft: number 
});
```

**From Backend → Frontend:**
```typescript
socket.on('game:config', ({ config: MatchConfig }));
socket.on('game:topic-phase', ());
socket.on('game:waiting-topics', ({ submitted, total }));
socket.on('game:voting-phase', ({ topics: Topic[] }));
socket.on('game:waiting-votes', ({ voted, total }));
socket.on('game:topic-selected', ({ topic: string }));
socket.on('game:question', ({ question: Question, number: number }));
socket.on('game:question-result', ({ correctAnswer: number, scores: PlayerScore[] }));
socket.on('game:over', ({ finalScores: PlayerScore[] }));
```

### Backend Implementation Checklist:

1. **Create Game State Machine:**
   - Track current stage per lobby/room
   - Store submitted topics
   - Store votes
   - Generate questions based on winning topic

2. **Topic Phase Logic:**
   - Collect topics from all players
   - When all submitted, emit `game:voting-phase`
   - Accept votes
   - Calculate winner
   - Emit `game:topic-selected`

3. **Question Phase Logic:**
   - Generate questions from winning topic (AI/API)
   - Send questions one by one
   - Track answers + time
   - Calculate scores
   - Emit results after each question

4. **Scoring Algorithm:**
   - Base points for correct answer
   - Time bonus (faster = more points)
   - Track cumulative scores

5. **Database Integration:**
   - Save `GameResult` after game ends
   - Update `UserStats` (gamesPlayed, gamesWon, etc.)

## File Structure

```
frontend/app/
├── game/page.tsx          # NEW: Multi-stage game flow
├── quiz/page.tsx          # OLD: Can be deprecated or merged
├── lobby/page.tsx         # Existing: Pre-game lobby
├── profile/page.tsx       # UPDATED: Match history display
├── lib/
│   ├── profile.ts         # UPDATED: MatchHistory interface
│   └── socket.ts          # Existing: WebSocket singleton
```

## Configuration

The `MatchConfig` interface is already defined:
```typescript
interface MatchConfig {
  roundsTotal: number;
  timePerQuestion: number;
  questionsPerRound: number;
}
```

This should be sent from backend when game starts.

## Testing Workflow

1. Start from Dashboard → "Create Game"
2. Navigate to Lobby
3. Lobby → "Start Game" → Navigate to `/game`
4. Test each stage independently
5. Verify WebSocket events in browser console
6. Check scores update correctly
7. Verify game results save to database
8. Check profile page displays history

## Suggested Improvements

1. **Add Loading States:** Show spinners during API calls
2. **Error Handling:** Display user-friendly errors
3. **Topic Suggestions:** Fetch from backend API
4. **Animations:** Add transitions between stages
5. **Sound Effects:** Victory/defeat sounds
6. **Power-ups:** Special abilities or bonuses
7. **Spectator Mode:** Allow watching ongoing games

## Backend Routes Needed

```
POST /api/game/submit-topic
POST /api/game/vote-topic
POST /api/game/submit-answer
GET  /api/game/:gameId/results
GET  /api/users/:userId/match-history
```

## Questions for Backend Team

1. What namespace should the game socket use? (`/game` or `/quiz`?)
2. How many players per game (min/max)?
3. What happens if a player disconnects mid-game?
4. Should we support reconnection?
5. Is there a rating/ELO system?
6. Can players play solo (vs AI or pre-set questions)?
