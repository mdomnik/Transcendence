import { IsUUID } from "class-validator";

export class LobbyDto {

    @IsUUID()
    lobbyId: string;
}