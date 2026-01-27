import {
  WebSocketGateway,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  WebSocketServer,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { DashboardService } from './dashboard.service';
import { JwtService } from '@nestjs/jwt';
import { initWsAuth } from 'src/websocket/websocket.init';

@WebSocketGateway({
  namespace: '/quiz',
  cors: {
    origin: ['https://localhost:3000', 'https://localhost:3001'],
    credentials: true,
  },
})
export class DashboardGateway implements OnGatewayInit {
  @WebSocketServer()
  private server: Server;

  constructor(
    private readonly dashboardService: DashboardService,
    private readonly jwtService: JwtService,
  ) {}

  afterInit(server: Server) {
    initWsAuth(server, this.jwtService);
  }

  @SubscribeMessage('dashboard:connect')
  async onDashboardConnect(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId;
    console.log(`User ${userId} has connected to the dashboard`);
    return { ok: true };
  }
}

