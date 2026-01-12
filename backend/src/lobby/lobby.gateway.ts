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
} from '@nestjs/websockets';
import * as cookie from 'cookie';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { WsJwtGuard } from 'src/auth/ws-jwt.guard';
import { LobbyService } from 'src/lobby/lobby.service';
import { LobbyDto, LobbyKickDto } from './dto';
import { UnauthorizedException } from '@nestjs/common';

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
    private readonly jwtService: JwtService,
  ) {}

  // Run once when the server is initialized
  afterInit(server: Server) {
    // Middleware to authenticate sockets using cookie
    server.use((socket: Socket, next) => {
      try {
        console.log('Handshake headers:', socket.handshake.headers);
        const rawCookie = socket.handshake.headers.cookie;
        if (!rawCookie) {
          console.log('no cookie');
          throw new UnauthorizedException('No cookie found');
        }
        // Parse raw cookie string into key-value pairs
        const parsed = cookie.parse(rawCookie);
        const token = parsed['access_token'];
        if (!token)
          throw new UnauthorizedException('No access token in cookie');

        // Verify JWT using JwtService (same as your HTTP JwtStrategy)
        // TODO! Fix later :)
        const payload = this.jwtService.verify(token, {
          secret: process.env.JWT_SECRET,
        });
        socket.data.userId = payload.sub; // attach userId to socket
        next();
      } catch (err) {
        next(new UnauthorizedException(err));
      }
    });
    console.log('Quiz WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('lobby:create')
  async onLobbyCreate(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId;

    const lobby = await this.lobbyService.createLobby(userId);

    client.join(lobby.lobbyId);

    this.server.to(lobby.lobbyId).emit('lobby:update', lobby);

    return { ok: true }; 
  }

  @SubscribeMessage('lobby:join')
  async onLobbyJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: LobbyDto,
  ) {
    const userId = client.data.userId;

    const lobby = await this.lobbyService.joinLobby(dto.lobbyId, userId);

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
