import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { QuizService } from './quiz.service';

@WebSocketGateway({
  namespace: '/quiz',
  cors: {
    origin: '*',
  },
})
export class QuizGateway {
  @WebSocketServer()
  private server: Server;

  constructor(private readonly quizService: QuizService) {}

  afterInit() {
    console.log('Quiz WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('room:join')
  async handleJoin(client: Socket, payload: { roomId: string }) {
    await client.join(payload.roomId);

    const state = await this.quizService.getRoomState(payload.roomId);

    client.emit('room:state', state);
  }
}