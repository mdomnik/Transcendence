import {
  WebSocketGateway,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { LeaderboardService } from './leaderboard.service';
import { OnEvent } from '@nestjs/event-emitter';

@WebSocketGateway({
  namespace: '/quiz',
  cors: {
    origin: 'https://shehani.quizeverything.tech',
    credentials: true,
  },
})
export class LeaderboardGateway {
  @WebSocketServer()
  private server: Server;

  constructor(private readonly leaderboardService: LeaderboardService) {}

  @SubscribeMessage('leaderboard:get')
  async getLeaderboard(
    @MessageBody() _: any,
    @ConnectedSocket() client: Socket,
  ) {
    const data = await this.leaderboardService.getTop(20);
    console.log(data);
    client.emit('leaderboard:data', {
      ok: true,
      data,
    });
    return;
  }

  @OnEvent('leaderboard:updated')
  async broadcastUpdate() {
    const data = await this.leaderboardService.getTop(20);
    this.server.emit('leaderboard:update', data);
  }
}
