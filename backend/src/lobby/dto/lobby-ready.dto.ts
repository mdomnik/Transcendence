import { IsBoolean, IsUUID } from "class-validator";

export class LobbyReadyDto {
    @IsUUID()
    id: string;

    @IsBoolean()
    ready: boolean;
}