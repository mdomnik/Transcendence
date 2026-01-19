import { IsInt, IsUUID, Min, Max, IsEnum, IsOptional, IsString } from 'class-validator';

export enum LobbyConfigKey {
  ROUNDS = 'roundsTotal',
  QUESTIONS = 'questionsPerRound',
  TIME = 'timePerQuestion',
  TOPIC = 'topic',
  DIFFICULTY = 'difficulty',
}

export class LobbyConfigDto {
  @IsUUID()
  lobbyId: string;

  @IsEnum(LobbyConfigKey)
  key: LobbyConfigKey;

  @IsOptional()
  @IsInt()
  @Min(-5)
  @Max(5)
  delta?: number;

  @IsOptional()
  @IsString()
  value?: string;
}
