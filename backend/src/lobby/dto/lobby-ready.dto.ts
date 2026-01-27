import { IsBoolean, IsUUID } from "class-validator";

export class LobbyReadyDto {
    @IsUUID()
    lobbyId: string;

    @IsBoolean()
    ready: boolean;
}