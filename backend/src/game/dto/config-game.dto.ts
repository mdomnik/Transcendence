import {
  IsInt,
  IsUUID,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

class ConfigDto {

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  roundTotal: number;

  @Type(() => Number)
  @IsInt()
  @Min(20)
  @Max(120)
  timePerQuestion: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  questionsPerRound: number;
}


export class ConfigGameDto {
    
    @IsUUID()
    lobbyId: string;

    config: ConfigDto;
}