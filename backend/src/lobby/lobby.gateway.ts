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
import { LobbyDto } from './dto';
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
        const payload = this.jwtService.verify(token, { secret: process.env.JWT_SECRET });
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

  @SubscribeMessage('lobby:join')
  async onLobbyJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: LobbyDto,
  ) {
    const userId = client.data.userId;
    const lobbyId = dto.id;

    const lobby = await this.lobbyService.joinLobby(lobbyId, userId);

    await client.join(lobbyId);
    this.server.to(lobbyId).emit('lobby:update', lobby);

    return lobby;
  }

  @SubscribeMessage('lobby:create')
  async onLobbyCreate(@ConnectedSocket() client: Socket) {
    console.log('Message received');
    const userId = client.data.userId;

    const lobby = await this.lobbyService.createLobby(userId);
    console.log('lobby created');

    return lobby;
  }
  /*   @UseGuards(WsJwtGuard)
  @SubscribeMessage('lobby:leave')
  async onLobbyLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: LobbyDto,
  ) {
    const userId = client.data.userId;
    const lobbyId = dto.id;

    const result = await this.lobbyService.leaveLobby(lobbyId, userId);

    client.leave(lobbyId);

    if (result.type === 'DESTROYED') {
      this.server.to(lobbyId).emit('lobby:deleted');
      return { status: 'LOBBY_DELETED' };
    }

    this.server.to(lobbyId).emit('lobby:update', result);
    return { status: 'LEFT_LOBBY' };
  } */
}
