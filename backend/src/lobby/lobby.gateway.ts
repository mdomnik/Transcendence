/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  WebSocketGateway,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { LobbyDto, LobbyJoinDto, LobbyKickDto, LobbyConfigDto } from './dto';
import { LobbyService } from './lobby.service';
import { LobbyKeys } from './lobby.keys';
import { GameService } from 'src/game/game.service';
import { RedisService } from 'src/redis/redis.service';
import { forwardRef, Inject } from '@nestjs/common';

@WebSocketGateway({
  namespace: '/quiz',
  cors: {
    origin: 'https://localhost',
    credentials: true,
  },
})
export class LobbyGateway {
  @WebSocketServer()
  private server: Server;

  constructor(
    private readonly lobbyService: LobbyService,
    private readonly redisService: RedisService,
    @Inject(forwardRef(() => GameService))
    private readonly gameService: GameService,
  ) {}

  private async broadcastStatus(userId: string) {
    const online = await this.redisService.isUserOnline(userId);
    if (!online) {
      this.server.emit('presence:updated', { userId, status: 'offline' });
      return;
    }
    const lobbyId = await this.lobbyService.getLobbyIdForUser(userId);
    const status = lobbyId ? 'in-game' : 'online';
    this.server.emit('presence:updated', { userId, status });
  }

  handleConnection(client: Socket) {
    client.onAny((event, payload) => {
      console.log(`[WS] event=${event} user=${client.data.userId}`, payload);
    });
    client.onAnyOutgoing((event, payload) => {
      console.log(
        `[WS] outgoing event=${event} user=${client.data.userId}`,
        payload,
      );
    });
  }

  private async emitRemovalAndLeaveRoom(
    lobbyId: string,
    targetUserId: string,
    reason: 'LEFT' | 'KICKED' | 'BANNED',
  ) {
    const sockets = await this.server.fetchSockets();

    for (const s of sockets) {
      if (s.data.userId === targetUserId) {
        s.leave(lobbyId);
        s.emit('lobby:removed', { reason });
      }
    }
  }

  @SubscribeMessage('lobby:create')
  async onLobbyCreate(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId;
    try {
      const lobby = await this.lobbyService.createLobby(userId);

      client.join(lobby.lobbyId);
      this.server.to(lobby.lobbyId).emit('lobby:update', lobby);
      await this.broadcastStatus(userId);

      return { ok: true, data: lobby };
    } catch (err: any) {
      return { ok: false, error: err?.message ?? 'FORBIDDEN' };
    }
  }

  @SubscribeMessage('lobby:join')
  async onLobbyJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: LobbyJoinDto,
  ) {
    const userId = client.data.userId;

    const lobbyId = await this.lobbyService.findLobbyIdFromLobbyCode(
      dto.lobbyCode,
    );
    if (!lobbyId) return { ok: false, error: 'INVALID_LOBBY_CODE' };

    try {
      const lobby = await this.lobbyService.joinLobby(lobbyId, userId);
      client.join(lobby.lobbyId);
      this.server.to(lobby.lobbyId).emit('lobby:update', lobby);
      await this.broadcastStatus(userId);
      return { ok: true, data: lobby };
    } catch (err: any) {
      return { ok: false, error: err?.message ?? 'UNABLE_TO_JOIN_LOBBY' };
    }
  }

  @SubscribeMessage('lobby:leave')
  async onLobbyLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: LobbyDto,
  ) {
    const userId = client.data.userId;

    try {
      const lobby = await this.lobbyService.leaveLobby(dto.lobbyId, userId);

      await this.emitRemovalAndLeaveRoom(dto.lobbyId, userId, 'LEFT');
      await this.broadcastStatus(userId);

      if (!lobby) {
        this.server.to(dto.lobbyId).emit('lobby:deleted');
        return { ok: true, data: null };
      }

      this.server.to(lobby.lobbyId).emit('lobby:update', lobby);
      return { ok: true, data: lobby };
    } catch (err) {
      console.warn('Error leaving lobby', err);
      return { ok: false, error: err?.message ?? 'UNABLE_TO_LEAVE_LOBBY' };
    }
  }

  @SubscribeMessage('lobby:ready')
  async onLobbyReady(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: LobbyDto,
  ) {
    const lobby = await this.lobbyService.setReady(
      dto.lobbyId,
      client.data.userId,
      true,
    );

    this.server.to(lobby.lobbyId).emit('lobby:update', lobby);
    return { ok: true, data: lobby };
  }

  @SubscribeMessage('lobby:unready')
  async onLobbyUnready(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: LobbyDto,
  ) {
    const lobby = await this.lobbyService.setReady(
      dto.lobbyId,
      client.data.userId,
      false,
    );

    this.server.to(lobby.lobbyId).emit('lobby:update', lobby);
    return { ok: true, data: lobby };
  }

  @SubscribeMessage('lobby:retry')
  async onLobbyRetry(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: LobbyDto,
  ) {
    const lobby = await this.lobbyService.retryLobby(
      dto.lobbyId,
      client.data.userId,
    );

    this.server.to(lobby.lobbyId).emit('lobby:update', lobby);
    return { ok: true, data: lobby };
  }

  @SubscribeMessage('lobby:kick')
  async onLobbyKick(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: LobbyKickDto,
  ) {
    const lobby = await this.lobbyService.kickPlayer(
      dto.lobbyId,
      client.data.userId,
      dto.targetId,
    );

    await this.emitRemovalAndLeaveRoom(dto.lobbyId, dto.targetId, 'KICKED');
    await this.broadcastStatus(dto.targetId);

    this.server.to(dto.lobbyId).emit('lobby:update', lobby);
    return { ok: true, data: lobby };
  }

  @SubscribeMessage('lobby:ban')
  async onLobbyBan(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: LobbyKickDto,
  ) {
    const lobby = await this.lobbyService.banPlayer(
      dto.lobbyId,
      client.data.userId,
      dto.targetId,
    );

    await this.emitRemovalAndLeaveRoom(dto.lobbyId, dto.targetId, 'BANNED');
    await this.broadcastStatus(dto.targetId);

    this.server.to(dto.lobbyId).emit('lobby:update', lobby);
    return { ok: true, data: lobby };
  }

  @SubscribeMessage('lobby:start')
  async onLobbyStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: LobbyDto,
  ) {
    const lobby = await this.lobbyService.startGame(
      dto.lobbyId,
      client.data.userId,
    );

    // 1️⃣ Create match
    await this.gameService.createMatchFromLobby(lobby);

    this.server.to(lobby.lobbyId).emit('lobby:update', lobby);

    const gameView = await this.gameService.getGameView(lobby.lobbyId);
    this.server.to(lobby.lobbyId).emit('game:state', gameView);

    return { ok: true };
  }

  @SubscribeMessage('lobby:sync')
  async onLobbySync(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId;
    try {
      const lobbyId = await this.lobbyService.getLobbyIdForUser(userId);
      if (!lobbyId) return { ok: false, error: 'NOT_IN_LOBBY' };

      const isBanned = await this.lobbyService.redis.client.sismember(
        LobbyKeys.banned(lobbyId),
        userId,
      );
      if (isBanned) return { ok: false, error: 'BANNED_FROM_LOBBY' };

      const lobby = await this.lobbyService.getLobby(lobbyId);
      // if (lobby.state == 'FINISHED') lobby.state = 'WAITING';
      client.join(lobbyId);

      return { ok: true, data: lobby };
    } catch (err) {
      return { ok: false, error: 'SYNC_FAILED' };
    }
  }

  @SubscribeMessage('lobby:config')
  async onLobbyUpdateConfig(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: LobbyConfigDto,
  ) {
    const lobby = await this.lobbyService.updateMatchConfig(
      dto.lobbyId,
      client.data.userId,
      dto.key,
      dto.delta,
      dto.value,
    );

    this.server.to(lobby.lobbyId).emit('lobby:update', lobby);
    return { ok: true, data: lobby };
  }

  @SubscribeMessage('lobby:preview')
  async onLobbyPreview(@MessageBody() dto: LobbyJoinDto) {
    const lobbyId = await this.lobbyService.findLobbyIdFromLobbyCode(
      dto.lobbyCode,
    );
    if (!lobbyId) return { ok: false };

    const meta = await this.lobbyService.getLobby(lobbyId);
    return {
      ok: true,
      data: {
        memberCount: meta.members.length,
        maxPlayers: meta.maxPlayers,
      },
    };
  }
}
