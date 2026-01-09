export type RoomStatus = 'WAITING' | 'IN_PROGRESS' | 'FINISHED';

export interface RoomMeta {
  status: RoomStatus;
  round: number;
  questionIndex: number;
  expiresAt: number;
}

export interface RoomPlayer {
  userId: string;
  name: string;
  score: number;
  connected: boolean;
}

export interface RoomQuestion {
  id: string;
  prompt: string;
  answers: string[];
  correctIndex: number;
}
