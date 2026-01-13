import { IsString, Length, MaxLength } from "class-validator";

export class LobbyJoinDto {

    @IsString()
    @Length(8)
    lobbyCode: string;
}