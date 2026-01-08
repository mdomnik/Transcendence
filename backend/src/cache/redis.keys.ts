export const RedisKeys = {
  roomMeta: (roomId: string) => `quiz:room:${roomId}:meta`,

  roomPlayers: (roomId: string) => `quiz:room:${roomId}:players`,

  roomQuestion: (roomId: string) => `quiz:room:${roomId}:question`,

  roomAnswers: (roomId: string) => `quiz:room:${roomId}:answers`,

  roomLock: (roomId: string) => `quiz:room:${roomId}:lock`,
} as const;
