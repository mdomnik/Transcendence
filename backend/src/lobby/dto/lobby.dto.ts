import { IsUUID } from "class-validator";

export class LobbyDto {

    @IsUUID()
    id: string;
}