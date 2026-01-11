import { IsBoolean, IsUUID } from "class-validator";

export class LobbyKickDto {
    @IsUUID()
    ownerId: string;

    @IsUUID()
    targetId: string;
}