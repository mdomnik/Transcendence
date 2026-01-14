/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Body, UseGuards } from '@nestjs/common';
import {
  WebSocketGateway,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { LobbyService } from 'src/lobby/lobby.service';
import { LobbyDto, LobbyJoinDto, LobbyKickDto } from './dto';
import { initWsAuth } from 'src/websocket/websocket.init';

@WebSocketGateway({
  namespace: '/quiz',
  cors: {
    origin: 'https://localhost',
    credentials: true,
  },
})
export class LobbyGateway
  implements OnGatewayInit, OnGatewayConnection
{
  @WebSocketServer()
  private server: Server;

  constructor(
    private readonly lobbyService: LobbyService,
    private readonly jwtService: JwtService,
  ) {}

  afterInit(server: Server) {
    console.log('Lobby WebSocket Gateway initialized');
    // Initialize Auth middleware
    initWsAuth(server, this.jwtService);
  }

  handleConnection(client: Socket) {
    const userId = client.data.userId;
    console.log('[LobbyGateway] Client connected: ' + client.id + ', userId: ' + userId);
    
    // Log every event for debugging
    client.onAny((event, ...args) => {
      console.log('[LobbyGateway] Incoming event: ' + event, args);
    });
  }

  @SubscribeMessage('lobby:create')
  async onLobbyCreate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {
    try {
      const userId = client.data.userId;
      if (!userId) return { ok: false, error: 'Unauthorized' };

      const lobby = await this.lobbyService.createLobby(userId);
      client.join(lobby.lobbyId);
      this.server.to(lobby.lobbyId).emit('lobby:update', lobby);

      return { ok: true };
    } catch (error) {
      if (error.status === 403 || error.message?.includes('already in a lobby')) {
        const userId = client.data.userId;
        const existingId = await this.lobbyService.getLobbyIdForUser(userId);
        if (existingId) {
          const lobby = await this.lobbyService.getLobby(existingId);
          client.join(existingId);
          client.emit('lobby:update', lobby);
          return { ok: true };
        }
      }
      return { ok: false, error: error.message || 'Failed to create lobby' };
    }
  }

  @SubscribeMessage('lobby:join')
  async onLobbyJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: LobbyJoinDto,
  ) {
    try {
      const userId = client.data.userId;
      if (!userId) return { ok: false, error: 'Unauthorized' };

      let lobbyId = dto.lobbyId;
      
      if (dto.lobbyCode) {
          const foundId = await this.lobbyService.findLobbyIdFromLobbyCode(dto.lobbyCode);
          if (!foundId) return { ok: false, error: 'Invalid lobby code' };
          lobbyId = foundId;
      }

      if (!lobbyId) return { ok: false, error: 'Lobby ID or code required' };

      const lobby = await this.lobbyService.joinLobby(lobbyId, userId);

      client.join(lobby.lobbyId);
      this.server.to(lobby.lobbyId).emit('lobby:update', lobby);

      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message || 'Failed to join lobby' };
    }
  }

  @SubscribeMessage('lobby:leave')
  async onLobbyLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: LobbyDto,
  ) {
    const userId = client.data.userId;
    if (!userId) return { ok: false, error: 'Unauthorized' };

    try {
      const lobby = await this.lobbyService.leaveLobby(dto.lobbyId, userId);
      client.leave(dto.lobbyId);

      if (!lobby) {
        this.server.to(dto.lobbyId).emit('lobby:deleted');
      } else {
        this.server.to(lobby.lobbyId).emit('lobby:update', lobby);
      }
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message || 'Failed to leave lobby' };
    }
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
    try {
      const lobby = await this.lobbyService.startSetup(dto.lobbyId, userId);
      this.server.to(lobby.lobbyId).emit('lobby:update', lobby);
      this.server.to(lobby.lobbyId).emit('lobby:started', { 
        lobbyId: lobby.lobbyId,
        state: lobby.state 
      });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message || 'Failed to start game' };
    }
  }

  @SubscribeMessage('lobby:sync')
  async onLobbySync(@ConnectedSocket() client: Socket) {
    try {
      const userId = client.data.userId;
      if (!userId) return { ok: false, error: 'Unauthorized' };

      const lobbyId = await this.lobbyService.getLobbyIdForUser(userId);
      if (!lobbyId) return { ok: false, error: 'User not in a lobby' };

      const lobby = await this.lobbyService.getLobby(lobbyId);
      client.join(lobbyId);
      client.emit('lobby:update', lobby);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: 'Internal server error' };
    }
  }
}
