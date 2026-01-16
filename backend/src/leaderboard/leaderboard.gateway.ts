/* import {
  WebSocketGateway,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  namespace: '/leaderboard',
  cors: {
    origin: 'https://localhost',
    credentials: true,
  },
})
export class LeaderboardGateway {
  @WebSocketServer()
  private server: Server;

  @SubscribeMessage('leaderboard:update')
  async onLeaderboardUpdate(@ConnectedSocket() client: Socket) {}

  @SubscribeMessage('leaderboard:')
}
 */