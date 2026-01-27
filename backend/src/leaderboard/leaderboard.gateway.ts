import {
  WebSocketGateway,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  WebSocketServer,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { LeaderboardService } from './leaderboard.service';
import { OnEvent } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { initWsAuth } from 'src/websocket/websocket.init';

@WebSocketGateway({
  namespace: '/quiz',
  cors: {
    origin: ['https://localhost:3000', 'https://localhost:3001'],
    credentials: true,
  },
})
export class LeaderboardGateway implements OnGatewayInit {
  @WebSocketServer()
  private server: Server;

  constructor(
    private readonly leaderboardService: LeaderboardService,
    private readonly jwtService: JwtService,
  ) {}

  afterInit(server: Server) {
    initWsAuth(server, this.jwtService);
  }

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
