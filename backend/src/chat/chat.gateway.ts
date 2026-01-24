import {
  WebSocketGateway,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  WebSocketServer,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { RedisService } from 'src/redis/redis.service';
import { JwtService } from '@nestjs/jwt';
import { initWsAuth } from 'src/websocket/websocket.init';

@WebSocketGateway({
  namespace: '/quiz',
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? `https://${process.env.DOMAIN || 'localhost'}`
      : ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayInit {
  @WebSocketServer()
  private server: Server;

  constructor(
    private readonly chatService: ChatService,
    private readonly redis: RedisService,
    private readonly jwtService: JwtService,
  ) {}

  afterInit(server: Server) {
    initWsAuth(server, this.jwtService);
  }

  @SubscribeMessage('chat:send')
  async onSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { receiverId: string; content: string },
  ) {
    const senderId = client.data.userId;
    if (!senderId) return { ok: false, error: 'UNAUTHORIZED' };

    try {
      const message = await this.chatService.saveMessage(
        senderId,
        data.receiverId,
        data.content,
      );

      // Emit to sender (to sync multiple tabs)
      const senderSockets = await this.redis.client.smembers(`user:${senderId}:sockets`);
      for (const sId of senderSockets) {
        this.server.to(sId).emit('chat:receive', message);
      }

      // Emit to receiver
      const receiverSockets = await this.redis.client.smembers(
        `user:${data.receiverId}:sockets`,
      );
      for (const sId of receiverSockets) {
        this.server.to(sId).emit('chat:receive', message);
      }

      return { ok: true, data: message };
    } catch (err: any) {
      return { ok: false, error: err?.message ?? 'SEND_FAILED' };
    }
  }

  @SubscribeMessage('chat:mark_read')
  async onMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { friendId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return { ok: false, error: 'UNAUTHORIZED' };

    try {
      await this.chatService.markAsRead(userId, data.friendId);
      
      // Notify sender that their messages were read (optional enhancement)
      // For now just return ok
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err?.message ?? 'MARK_READ_FAILED' };
    }
  }

  @SubscribeMessage('chat:unread_counts')
  async onGetUnreadCounts(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId;
    if (!userId) return { ok: false, error: 'UNAUTHORIZED' };

    try {
      const counts = await this.chatService.getUnreadCounts(userId);
      return { ok: true, data: counts };
    } catch (err: any) {
      return { ok: false, error: err?.message ?? 'UNREAD_FAILED' };
    }
  }

  @SubscribeMessage('chat:history')
  async onGetHistory(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { friendId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return { ok: false, error: 'UNAUTHORIZED' };

    try {
      const messages = await this.chatService.getMessages(userId, data.friendId);
      return { ok: true, data: messages };
    } catch (err: any) {
      return { ok: false, error: err?.message ?? 'HISTORY_FAILED' };
    }
  }
}
