import {
  IsUUID,
} from 'class-validator';

export class SubmitAnswerDto {
  @IsUUID()
  lobbyId: string;

  @IsUUID()
  questionId: string;

  @IsUUID()
  answerId: string;
}
