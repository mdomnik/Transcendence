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
import { dot } from 'node:test/reporters';

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

  constructor(private readonly lobbyService: LobbyService) {}

  @SubscribeMessage('lobby:create')
  async onLobbyCreate(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId;

    const lobby = await this.lobbyService.createLobby(userId);

    if (!lobby) {
      return {
        ok: false,
        error: 'LOBBY_CREATION_FAILED',
      };
    }

    client.join(lobby.lobbyId);

    this.server.to(lobby.lobbyId).emit('lobby:update', lobby);

    console.log(
      `lobby created for user: ${userId}, lobby id: ${lobby.lobbyId}`,
    );

    return {
      ok: true,
      data: lobby,
    };
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

    if (!lobbyId) {
      return {
        ok: false,
        error: 'INVALID_LOBBY_CODE',
      };
    }

    const lobby = await this.lobbyService.joinLobby(lobbyId, userId);

    if (!lobby) {
      return {
        ok: false,
        error: 'UNABLE_TO_JOIN_LOBBY',
      };
    }

    client.join(lobby.lobbyId);

    this.server.to(lobby.lobbyId).emit('lobby:update', lobby);
    return {
      ok: true,
      data: lobby,
    };
  }

  @SubscribeMessage('lobby:leave')
  async onLobbyLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: LobbyDto,
  ) {
    const userId = client.data.userId;

    const lobby = await this.lobbyService.leaveLobby(dto.lobbyId, userId);

    if (!lobby) {
      this.server.to(dto.lobbyId).emit('lobby:deleted');
      client.leave(dto.lobbyId);
      return {
        ok: true,
        data: null,
      };
    }

    client.leave(dto.lobbyId);
    this.server.to(lobby.lobbyId).emit('lobby:update', lobby);
    return {
      ok: true,
      data: lobby,
    };
  }

  @SubscribeMessage('lobby:ready')
  async onLobbyReady(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: LobbyDto,
  ) {
    const userId = client.data.userId;

    const lobby = await this.lobbyService.setReady(dto.lobbyId, userId, true);

    if (!lobby) {
      return {
        ok: false,
        error: 'SET_READY_FAILED',
      };
    }

    this.server.to(lobby.lobbyId).emit('lobby:update', lobby);

    return {
      ok: true,
      data: lobby,
    };
  }

  @SubscribeMessage('lobby:unready')
  async onLobbyUnready(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: LobbyDto,
  ) {
    const userId = client.data.userId;

    const lobby = await this.lobbyService.setReady(dto.lobbyId, userId, false);

    if (!lobby) {
      return {
        ok: false,
        error: 'SET_READY_FAILED',
      };
    }

    this.server.to(lobby.lobbyId).emit('lobby:update', lobby);

    return {
      ok: true,
      data: lobby,
    };
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
      return {
        ok: false,
        error: 'UNABLE_TO_KICK_PLAYER',
      };
    }

    const sockets = await this.server.in(dto.lobbyId).fetchSockets();
    for (const s of sockets) {
      if (s.data.userId === targetId) {
        s.leave(dto.lobbyId);
        s.emit('lobby:kicked');
      }
    }

    this.server.to(dto.lobbyId).emit('lobby:update', lobby);

    return {
      ok: true,
      data: lobby,
    };
  }

  @SubscribeMessage('lobby:start')
  async onLobbyStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: LobbyDto,
  ) {
    const userId = client.data.userId;

    const lobby = await this.lobbyService.startSetup(dto.lobbyId, userId);

    if (!lobby) {
      return {
        ok: false,
        error: 'UNABLE_TO_START_LOBBY',
      };
    }

    this.server.to(lobby.lobbyId).emit('lobby:update', lobby);

    return {
      ok: true,
      data: lobby,
    };
  }

  @SubscribeMessage('lobby:sync')
  async onLobbySync(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId;

    const lobbyId = await this.lobbyService.getLobbyIdForUser(userId);

    if (!lobbyId) {
      return {
        ok: false,
        error: 'NOT_IN_LOBBY',
      };
    }

    const lobby = await this.lobbyService.getLobby(lobbyId);

    if (!lobby) {
      return {
        ok: false,
        error: 'LOBBY_NOT_FOUND',
      };
    }

    client.join(lobbyId);
    client.emit('lobby:update', lobby);

    return {
      ok: true,
      data: lobby,
    };
  }

  @SubscribeMessage('lobby:config')
  async OnLobbyUpdateConfig(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: LobbyConfigDto,
  ) {
    const userId = client.data.userId;

    const lobby = await this.lobbyService.updateMatchConfig(
      dto.lobbyId,
      userId,
      dto.key,
      dto.delta,
    );

    if (!lobby) {
      return {
        ok: false,
        error: 'UNABLE_TO_UPDATE_SETTINGS',
      };
    }

    this.server.to(lobby.lobbyId).emit('lobby:update', lobby);

    return {
      ok: true,
      data: lobby,
    };
  }

  @SubscribeMessage('lobby:preview')
  async onLobbyPreview(@MessageBody() dto: LobbyJoinDto) {
    const lobbyId = await this.lobbyService.findLobbyIdFromLobbyCode(
      dto.lobbyCode,
    );

    if (!lobbyId) {
      return { ok: false };
    }

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
