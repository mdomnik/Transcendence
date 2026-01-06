import {
  IsString,
  IsInt,
  IsNotEmpty,
  Min,
  Max,
  MaxLength,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';


class AnswerDto {
  @IsString()
  @IsNotEmpty()
  text: string;

  @IsBoolean()
  isCorrect: boolean;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(4)
  position: number;
}

export class QuestionDto {
  @IsString()
  @IsNotEmpty()
  question: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3)
  difficulty: number;

  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  @ArrayMinSize(4)
  @ArrayMaxSize(4)
  answers: AnswerDto[];

  @IsString()
  @MaxLength(12)
  subject_icon: string;
}