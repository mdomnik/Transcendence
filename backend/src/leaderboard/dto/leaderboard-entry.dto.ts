export class LeaderboardEntryDto {
  userId: string;
  username: string;

  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;

  accuracy: number;
}
