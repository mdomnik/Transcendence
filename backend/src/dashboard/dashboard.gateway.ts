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

@WebSocketGateway({
  namespace: '/quiz',
})
export class DashboardGateway {
  @WebSocketServer()
  private server: Server;

  constructor(private readonly dashboardService: DashboardService) {}

  @SubscribeMessage('dashboard:connect')
  async onDashboardConnect(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId;
    console.log(`User ${userId} has connected to the dashboard`);
    return { ok: true };
  }
}

