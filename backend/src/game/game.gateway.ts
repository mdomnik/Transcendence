
import { WebSocketGateway, WebSocketServer, SubscribeMessage, ConnectedSocket, MessageBody } from '@nestjs/websockets'
import { Server, Socket } from "socket.io";
import { GameService } from "./game.service";
import { LobbyService } from "src/lobby/lobby.service";

@WebSocketGateway({
    cors: {
        origin: '*',
    },
})
export class GameGateway {
    @WebSocketServer()
    server: Server;

    constructor(
        private readonly gameService: GameService,
        private readonly lobbyService: LobbyService,
    ) {}
}