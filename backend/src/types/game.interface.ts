export type MatchState = 'SETUP' | 'IN_PROGRESS' | 'FINISHED';

export type PhaseState =
  | 'ROUND_START'
  | 'TOPIC_INPUT'
  | 'VOTING_START'
  | 'VOTING'
  | 'SELECT_TOPIC'
  | 'ANSWERING'
  | 'ROUND_END'
  | 'MATCH_END';

export interface RoundStartView {
  phase: 'ROUND_START';
  round: number;
}

export interface VotingStartView {
  phase: 'VOTING_START';
}

export interface TopicInputView {
  phase: 'TOPIC_INPUT';
  submittedBy: string[];
  proposals: Array<{
    userId: string;
    topicTitle: string;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  }>;
}

export interface VotingView {
  phase: 'VOTING';
  proposals: Array<{
    userId: string;
    topicTitle: string;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    votes: number;
  }>;
  votedBy: string[];
}

export interface QuestionSelectionView {
  phase: 'SELECT_TOPIC';
  proposals: Array<{
    userId: string;
    topicTitle: string;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    votes: number;
  }>;
  selectedProposal?: {
    userId: string;
    topicTitle: string;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  };
}

export interface AnsweringView {
  phase: 'ANSWERING';
  questions: Array<{
    id: string;
    text: string;
    answers: Array<{
      id: string;
      text: string;
    }>;
  }>;
  answeredBy: Record<string, string[]>;
  correctnessMap?: Record<string, Record<string, boolean>>; // userId -> questionId -> isCorrect
  selectedProposal?: {
    userId: string;
    topicTitle: string;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  };
}

export interface RoundEndView {
  phase: 'ROUND_END';
  scoreDeltas: Record<string, number>;
  totalScores: Record<string, number>;
}

export interface MatchEndView {
  phase: 'MATCH_END';
  finalScores: Record<string, number>;
  winners: string[];
}

export interface GameView {
  lobbyId: string;

  match: {
    state: MatchState;
    round: number;
    roundsTotal: number;
  };

  phase: {
    state: PhaseState;
    startedAt: number;
    endsAt: number | null;
  };

  config: {
    timePerQuestion: number;
    questionsPerRound: number;
  };

  players: Array<{
    userId: string;
    username: string;
    score: number;
    isConnected: boolean;
  }>;

  roundData: RoundView | null;
}

export type RoundView =
  | RoundStartView
  | TopicInputView
  | VotingStartView
  | VotingView
  | QuestionSelectionView
  | AnsweringView
  | RoundEndView
  | MatchEndView;
