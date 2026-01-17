export const GameKeys = {
  matchMeta: (lobbyId: string) => `match:${lobbyId}:meta`,
  matchConfig: (lobbyId: string) => `match:${lobbyId}:config`,
  scores: (lobbyId: string) => `match:${lobbyId}:scores`,

  roundMeta: (lobbyId: string, round: number) =>
    `match:${lobbyId}:round:${round}:meta`,

  roundInputs: (lobbyId: string, round: number) =>
    `match:${lobbyId}:round:${round}:inputs`,

  activeMatches: () => `match:active`,

  eventsChannel: () => `game-events`,

  selectLock: (lobbyId: string, round: number) =>
    `match:${lobbyId}:round:${round}:select_lock`,

  roundVotes: (lobbyId: string, round: number) =>
    `match:${lobbyId}:round:${round}:votes`,

  roundScore: (lobbyId: string, round: number) =>
    `match:${lobbyId}:round:${round}:score`,

  selected: (lobbyId: string, round: number) =>
    `match:${lobbyId}:round:${round}:selected`,

  questions: (lobbyId: string, round: number) =>
    `match:${lobbyId}:round:${round}:questions`,

  answers: (lobbyId: string, round: number) =>
    `match:${lobbyId}:round:${round}:answers`,
};
