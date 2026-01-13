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

@WebSocketGateway({
  namespace: '/quiz',
  cors: {
    origin: 'https://localhost',
    credentials: true,
  },
})
export class ConnectionGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private server: Server;

  constructor(private readonly jwtService: JwtService) {}

  afterInit(server: Server) {
    initWsAuth(server, this.jwtService);
    console.log('Quiz WebSocket initialized');
  }

  handleConnection(client: Socket) {
    console.log(`User ${client.data.userId} connected (${client.id})`);
  }

  handleDisconnect(client: Socket) {
    console.log(`User ${client.data.userId} disconnected (${client.id})`);
  }
}
