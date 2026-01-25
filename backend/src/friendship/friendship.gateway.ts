import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { FriendshipService } from './friendship.service';
import { JwtService } from '@nestjs/jwt';
import { initWsAuth } from 'src/websocket/websocket.init';

@WebSocketGateway({
  namespace: '/quiz',
<<<<<<< HEAD
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? `https://${process.env.DOMAIN || 'localhost'}`
      : ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  },
=======
  cors: { origin: 'https://shehani.quizeverything.tech', credentials: true },
>>>>>>> feature/lobby-gameplay-fixes
})
export class FriendshipGateway implements OnGatewayInit {
  @WebSocketServer() server: Server;

  constructor(
    private readonly friendshipService: FriendshipService,
    private readonly jwtService: JwtService,
  ) {}

  afterInit(server: Server) {
    initWsAuth(server, this.jwtService);
  }

  @SubscribeMessage('friendship:request')
  async request(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { userId: string },
  ) {
    const myId = client.data.userId as string;
    try {
      const row = await this.friendshipService.sendRequest(myId, body.userId);

      // Notify both parties that friendship state changed
      const otherId = this.otherFromRow(myId, row.userA.id, row.userB.id);
      
      // Transform data for each user
      const myFriendData = this.transformRowToFriend(myId, row);
      const otherFriendData = this.transformRowToFriend(otherId, row);

      this.emitToUser(myId, 'friendship:updated', { 
        type: 'REQUEST_SENT', 
        row: myFriendData 
      });
      this.emitToUser(otherId, 'friendship:updated', { 
        type: 'REQUEST_RECEIVED', 
        row: otherFriendData,
        fromUsername: myFriendData.friend.username,
        fromAvatarPath: myFriendData.friend.avatarPath
      });

      return { ok: true, data: row };
    } catch (e: any) {
      return this.err(e);
    }
  }

  @SubscribeMessage('friendship:accept')
  async accept(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { friendshipId: string },
  ) {
    const myId = client.data.userId as string;

    try {
      const row = await this.friendshipService.accept(myId, body.friendshipId);
      const otherId = this.otherFromRow(myId, row.userA.id, row.userB.id);
      const myUsername = row.userA.id === myId ? row.userA.username : row.userB.username;

      this.emitToUser(myId, 'friendship:updated', { type: 'ACCEPTED', row });
      this.emitToUser(otherId, 'friendship:updated', { 
        type: 'ACCEPTED', 
        row,
        fromUsername: myUsername
      });

      return { ok: true, data: row };
    } catch (e: any) {
      return this.err(e);
    }
  }

  @SubscribeMessage('friendship:reject')
  async reject(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { friendshipId: string },
  ) {
    const myId = client.data.userId as string;

    try {
      const row = await this.friendshipService.reject(myId, body.friendshipId);
      const otherId = this.otherFromRow(myId, row.userA.id, row.userB.id);

      this.emitToUser(myId, 'friendship:updated', { type: 'REJECTED', row });
      this.emitToUser(otherId, 'friendship:updated', { type: 'REJECTED', row });

      return { ok: true, data: row };
    } catch (e: any) {
      return this.err(e);
    }
  }

  @SubscribeMessage('friendship:cancel')
  async cancel(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { userId: string },
  ) {
    const myId = client.data.userId as string;

    try {
      const res = await this.friendshipService.cancel(myId, body.userId);

      // Cancel deletes the pending row; we can notify the other user with lightweight payload.
      this.emitToUser(myId, 'friendship:updated', { type: 'CANCELED', otherUserId: body.userId });
      this.emitToUser(body.userId, 'friendship:updated', { type: 'CANCELED', otherUserId: myId });

      return { ok: true, data: res };
    } catch (e: any) {
      return this.err(e);
    }
  }

  @SubscribeMessage('friendship:block')
  async block(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { userId: string },
  ) {
    const myId = client.data.userId as string;

    try {
      const row = await this.friendshipService.block(myId, body.userId);
      const otherId = this.otherFromRow(myId, row.userA.id, row.userB.id);

      this.emitToUser(myId, 'friendship:updated', { type: 'BLOCKED', row });
      this.emitToUser(otherId, 'friendship:updated', { type: 'BLOCKED', row });

      return { ok: true, data: row };
    } catch (e: any) {
      return this.err(e);
    }
  }

  @SubscribeMessage('friendship:unblock')
  async unblock(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { userId: string },
  ) {
    const myId = client.data.userId as string;

    try {
      const res = await this.friendshipService.unblock(myId, body.userId);

      // Unblock deletes the row; notify both parties.
      this.emitToUser(myId, 'friendship:updated', { type: 'UNBLOCKED', otherUserId: body.userId });
      this.emitToUser(body.userId, 'friendship:updated', { type: 'UNBLOCKED', otherUserId: myId });

      return { ok: true, data: res };
    } catch (e: any) {
      return this.err(e);
    }
  }

  @SubscribeMessage('friendship:list')
  async list(@ConnectedSocket() client: Socket) {
    const myId = client.data.userId as string;

    try {
      const friends = await this.friendshipService.friendsList(myId);
      return { ok: true, data: friends };
    } catch (e: any) {
      return this.err(e);
    }
  }

  @SubscribeMessage('friendship:blocked')
  async blocked(@ConnectedSocket() client: Socket) {
    const myId = client.data.userId as string;

    try {
      const blocked = await this.friendshipService.blockedUsers(myId);
      return { ok: true, data: blocked };
    } catch (e: any) {
      return this.err(e);
    }
  }

  // ---------------------------
  // Helpers
  // ---------------------------

  private userRoom(userId: string) {
    return `user:${userId}`;
  }

  private emitToUser(userId: string, event: string, payload: any) {
    this.server.to(this.userRoom(userId)).emit(event, payload);
  }

  private otherFromRow(myId: string, userAId: string, userBId: string) {
    return userAId === myId ? userBId : userAId;
  }

  private transformRowToFriend(userId: string, row: any) {
    // Extract the friend (other user) from the row
    const friend = row.userA.id === userId ? row.userB : row.userA;
    
    return {
      id: row.id,
      status: row.status,
      requesterId: row.requesterId,
      blockerId: row.blockerId,
      isRequester: row.requesterId === userId,
      friend: {
        id: friend.id,
        username: friend.username,
        avatarPath: friend.avatarPath,
        status: 'offline', // Will be updated by presence events
      },
    };
  }

  private err(e: any) {
    // Provide consistent ack payload shape
    return {
      ok: false,
      error: {
        message: e?.message ?? 'Unknown error',
        name: e?.name ?? 'Error',
        statusCode: e?.status ?? 500,
      },
    };
  }
}
