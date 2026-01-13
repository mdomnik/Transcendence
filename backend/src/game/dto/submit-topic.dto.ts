import {
  IsString,
  IsEnum,
  MinLength,
  MaxLength,
  Matches,
  IsNotEmpty,
  IsUUID,
} from 'class-validator';
import { Transform } from 'class-transformer';

export enum Difficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}
export class SubmitTopicDto {
  @IsUUID()
  lobbyId: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value.trim())
  @MinLength(3)
  @MaxLength(30)
  topicTitle: string;

  @IsEnum(Difficulty)
  difficulty: Difficulty;
}
