import { Body, UseGuards } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer, SubscribeMessage, ConnectedSocket, MessageBody } from '@nestjs/websockets'
import { Server, Socket } from "socket.io";
import { WsJwtGuard } from 'src/auth/ws-jwt.guard';
import { LobbyService } from "src/lobby/lobby.service";
import { LobbyDto } from './dto';

@WebSocketGateway({
    cors: {
        origin: '*',
    },
})
export class LobbyGateway {
    @WebSocketServer()
    server: Server;

    constructor(
        private readonly lobbyService: LobbyService,
    ) {}

    @UseGuards(WsJwtGuard)
    @SubscribeMessage('lobby:join')
    async onLobbyJoin(
        @ConnectedSocket() client: Socket,
        @MessageBody() dto: LobbyDto,
    ) {
        const userId = client.data.userId;
        const lobbyId = dto.id;

        const lobby = await this.lobbyService.joinLobby(
            lobbyId,
            userId,
        );

        client.join(lobbyId);
        this.server.to(lobbyId).emit('lobby:update', lobby);

        return lobby;
    }

    @UseGuards(WsJwtGuard)
    @SubscribeMessage('lobby:leave')
    async onLobbyLeave(
        @ConnectedSocket() client: Socket,
        @MessageBody() dto: LobbyDto,
    ) {
        const userId = client.data.userId;
        const lobbyId = dto.id;

        const result = await this.lobbyService.leaveLobby(
            lobbyId,
            userId,
        );

        client.leave(lobbyId);

        if (result.type === 'DESTROYED') {
            this.server.to(lobbyId).emit('lobby:deleted');
            return { status: 'LOBBY_DELETED' };
        }

        this.server.to(lobbyId).emit('lobby:update', result);
        return { status: 'LEFT_LOBBY'};

    }
}