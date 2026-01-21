
export const LobbyKeys = {
    meta: (lobbyId: string) => `lobby:${lobbyId}:meta`,
    members: (lobbyId: string) => `lobby:${lobbyId}:members`,
    ready: (lobbyId: string) => `lobby:${lobbyId}:ready`,
    userLobby: (userId: string) => `user:${userId}:lobby`,
    lobbyCode: (code: string) => `lobby:code:${code}`,
    banned: (lobbyId: string) => `lobby:${lobbyId}:banned`,

};