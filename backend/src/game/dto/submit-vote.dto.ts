import {
  IsUUID,
} from 'class-validator';

export class SubmitVoteDto {
  @IsUUID()
  lobbyId: string;

  @IsUUID()
  votedForUserId: string;
}
