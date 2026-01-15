/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';
import {
  ConfigGameDto,
  SubmitTopicDto,
  SubmitVoteDto,
  SubmitAnswerDto,
} from './dto';
import { LobbyService } from 'src/lobby/lobby.service';
import { forwardRef, Inject } from '@nestjs/common';

@WebSocketGateway({
  namespace: '/quiz',
  cors: {
    origin: 'https://localhost',
    credentials: true,
  },
})
export class GameGateway {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly gameService: GameService,
    @Inject(forwardRef(() => LobbyService))
    private readonly lobbyService: LobbyService,
  ) {}

  @SubscribeMessage('game:submit-topic')
  async handleSubmitTopic(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: SubmitTopicDto,
  ) {
    const userId = client.data.userId;

    await this.gameService.submitTopic(body.lobbyId, userId, {
      topicTitle: body.topicTitle,
      difficulty: body.difficulty,
    });

    await this.emitGameState(body.lobbyId);
  }

  @SubscribeMessage('game:submit-vote')
  async handleSubmitVote(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: SubmitVoteDto,
  ) {
    const userId = client.data.userId;

    await this.gameService.submitVote(
      body.lobbyId,
      userId,
      body.votedForUserId,
    );

    await this.emitGameState(body.lobbyId);
  }

  @SubscribeMessage('game:submit-answer')
  async handleSubmitAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: SubmitAnswerDto,
  ) {
    const userId = client.data.userId;

    await this.gameService.submitAnswer(body.lobbyId, userId, {
      questionId: body.questionId,
      answerId: body.answerId,
    });

    await this.emitGameState(body.lobbyId);
  }

  @SubscribeMessage('game:sync')
  async onGameSync(@ConnectedSocket() client: Socket) {
    console.log('🎮 syncing');
    const userId = client.data.userId;
    const lobbyId = await this.lobbyService.getLobbyIdForUser(userId);

    if (!lobbyId) return { ok: false };

    client.join(lobbyId);

    const view = await this.gameService.getGameView(lobbyId);

    client.emit('game:state', view);

    return { ok: true };
  }

  @SubscribeMessage('game:quit')
  async onGameQuit(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId;

    const lobbyId = await this.lobbyService.getLobbyIdForUser(userId);
    if (!lobbyId) return { ok: false };

    await this.gameService.quitGame(lobbyId, userId);

    // Remove socket from room and notify client
    client.leave(lobbyId);
    client.emit('game:quit-confirmed');

    return { ok: true };
  }

  private async emitGameState(lobbyId: string) {
    const view = await this.gameService.getGameView(lobbyId);
    if (!view) return;

    this.server.to(lobbyId).emit('game:state', view);
  }
}
