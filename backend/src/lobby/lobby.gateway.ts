import {
  WebSocketGateway,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { LobbyDto, LobbyJoinDto, LobbyKickDto } from './dto';
import { LobbyService } from './lobby.service';

@WebSocketGateway({
  namespace: '/quiz',
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true,
  },
})
export class LobbyGateway {
  @WebSocketServer()
  private server: Server;

  constructor(
    private readonly lobbyService: LobbyService) {}

  @SubscribeMessage('lobby:create')
  async onLobbyCreate(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId;

    const lobby = await this.lobbyService.createLobby(userId);

    client.join(lobby.lobbyId);

    this.server.to(lobby.lobbyId).emit('lobby:update', lobby);

    console.log(`lobby created for user: ${userId}, lobby id: ${lobby.lobbyId}`);

    return { ok: true }; 
  }

  @SubscribeMessage('lobby:join')
  async onLobbyJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: LobbyJoinDto,
  ) {
    const userId = client.data.userId;

    const lobbyId = await this.lobbyService.findLobbyIdFromLobbyCode(dto.lobbyCode);

    if (!lobbyId)
        return;

    const lobby = await this.lobbyService.joinLobby(lobbyId, userId);

    client.join(lobby.lobbyId);

    this.server.to(lobby.lobbyId).emit('lobby:update', lobby);
    return { ok: true };
  }

  @SubscribeMessage('lobby:leave')
  async onLobbyLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: LobbyDto,
  ) {
    const userId = client.data.userId;

    const lobby = await this.lobbyService.leaveLobby(dto.lobbyId, userId);

    client.leave(dto.lobbyId);

    if (!lobby) {
      this.server.to(dto.lobbyId).emit('lobby:deleted');
    } else {
      this.server.to(lobby.lobbyId).emit('lobby:update', lobby);
    }

    return { ok: true };
  }

  @SubscribeMessage('lobby:ready')
  async onLobbyReady(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: LobbyDto,
  ) {
    const userId = client.data.userId;

    const lobby = await this.lobbyService.setReady(dto.lobbyId, userId, true);

    this.server.to(lobby.lobbyId).emit('lobby:update', lobby);

    return { ok: true };
  }

  @SubscribeMessage('lobby:unready')
  async onLobbyUnready(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: LobbyDto,
  ) {
    const userId = client.data.userId;

    const lobby = await this.lobbyService.setReady(dto.lobbyId, userId, false);

    this.server.to(lobby.lobbyId).emit('lobby:update', lobby);

    return { ok: true };
  }

  @SubscribeMessage('lobby:kick')
  async onLobbyKick(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: LobbyKickDto,
  ) {
    const userId = client.data.userId;
    const targetId = dto.targetId;

    const lobby = await this.lobbyService.kickPlayer(
      dto.lobbyId,
      userId,
      targetId,
    );

    if (!lobby) {
      this.server.to(dto.lobbyId).emit('lobby:deleted');
    } else {
      this.server.to(dto.lobbyId).emit('lobby:update', lobby);
    }

    const sockets = await this.server.in(dto.lobbyId).fetchSockets();
    for (const s of sockets) {
      if (s.data.userId === targetId) {
        s.leave(dto.lobbyId);
        s.emit('lobby:kicked');
      }
    }

    this.server.to(dto.lobbyId).emit('lobby:update', lobby);

    return { ok: true };
  }

  @SubscribeMessage('lobby:start')
  async onLobbyStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: LobbyDto,
  ) {
    const userId = client.data.userId;

    const lobby = await this.lobbyService.startSetup(dto.lobbyId, userId);

    this.server.to(lobby.lobbyId).emit('lobby:update', lobby);

    return { ok: true };
  }

  @SubscribeMessage('lobby:sync')
  async onLobbySync(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId;

    const lobbyId = await this.lobbyService.getLobbyIdForUser(userId);

    if (!lobbyId) return { ok: false };

    const lobby = await this.lobbyService.getLobby(lobbyId);

    client.join(lobbyId);
    client.emit('lobby:update', lobby);

    return { ok: true };
  }
}
