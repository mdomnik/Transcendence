import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { initWsAuth } from './websocket.init';
import { RedisService } from 'src/redis/redis.service';
import { FriendshipService } from 'src/friendship/friendship.service';

@WebSocketGateway({
  namespace: '/quiz',
  cors: {
    origin: 'https://ferni.quizeverything.tech',
    credentials: true,
  },
})
export class ConnectionGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly friendshipService: FriendshipService,
  ) {}

  afterInit(server: Server) {
    initWsAuth(server, this.jwtService);
    console.log('Quiz WebSocket initialized');
  }

  async handleConnection(client: Socket) {
    const userId = client.data.userId as string;
    if (userId) {
      console.log(`[WS] User ${userId} connected (ID: ${client.id})`);
      // Join user-specific room for targeted messaging
      client.join(`user:${userId}`);
      await this.redisService.trackSocket(userId, client.id);
      await this.broadcastPresence(userId);
    } else {
      console.warn(`[WS] Connection from ${client.id} without userId`);
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId as string;
    if (userId) {
      console.log(`[WS] User ${userId} disconnected (ID: ${client.id})`);
      await this.redisService.untrackSocket(userId, client.id);
      await this.broadcastPresence(userId);
    }
  }

  private async broadcastPresence(userId: string) {
    const online = await this.redisService.isUserOnline(userId);
    let status = online ? 'online' : 'offline';

    if (online) {
      const lobbyId = await this.friendshipService.getLobbyIdForUser(userId);
      if (lobbyId) status = 'in-game';
    }

    this.server.emit('presence:updated', { userId, status });
  }
}
