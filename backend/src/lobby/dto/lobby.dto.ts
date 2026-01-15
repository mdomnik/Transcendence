import { IsOptional, IsString, IsUUID } from "class-validator";

export class LobbyDto {

    @IsUUID()
    lobbyId: string;

    @IsString()
    @IsOptional()
    topic?: string;
}
