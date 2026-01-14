import { IsInt, IsUUID, Min, Max, IsEnum } from 'class-validator';

export enum LobbyConfigKey {
  ROUNDS = 'roundsTotal',
  QUESTIONS = 'questionsPerRound',
  TIME = 'timePerQuestion',
}

export class LobbyConfigDto {
  @IsUUID()
  lobbyId: string;

  @IsEnum(LobbyConfigKey)
  key: LobbyConfigKey;

  @IsInt()
  @Min(-5)
  @Max(5)
  delta: number;
}
