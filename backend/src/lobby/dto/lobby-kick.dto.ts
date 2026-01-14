import { IsUUID } from "class-validator";

export class LobbyKickDto {
    
    @IsUUID()
    lobbyId: string;

    @IsUUID()
    targetId: string;
}