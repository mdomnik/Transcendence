export const GameKeys = {
    matchMeta: (lobbyId: string) => `match:${lobbyId}:meta`,
    matchConfig: (lobbyId: string) => `match:${lobbyId}:config`,
    scores: (lobbyId: string) => `match:${lobbyId}:scores`,

    roundMeta: (lobbyId: string, round: number) =>
        `match:${lobbyId}:round:${round}:meta`,

    roundInputs: (lobbyId: string, round: number) =>
        `match:${lobbyId}:round:${round}:inputs`,

    roundVotes: (lobbyId: string, round: number) =>
        `match:${lobbyId}:round:${round}:votes`,

    selected: (lobbyId: string, round: number) =>
        `match:${lobbyId}:round:${round}:selected`,

    questions: (lobbyId: string, round: number) =>
        `match:${lobbyId}:round:${round}:questions`,

    answers: (lobbyId: string, round: number) =>
        `match:${lobbyId}:round:${round}:answers`,
}