import { IsInt, IsUUID, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

class ConfigDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(15)
  roundTotal: number;

  @Type(() => Number)
  @IsInt()
  @Min(10)
  @Max(60)
  timePerQuestion: number;

  @Type(() => Number)
  @IsInt()
  @Min(3)
  @Max(12)
  questionsPerRound: number;
}

export class ConfigGameDto {
  @IsUUID()
  lobbyId: string;

  config: ConfigDto;
}
