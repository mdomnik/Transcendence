/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayInit,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';
import { SubmitTopicDto, SubmitVoteDto, SubmitAnswerDto } from './dto';
import { LobbyService } from 'src/lobby/lobby.service';
import { RedisService } from 'src/redis/redis.service';
import { forwardRef, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { initWsAuth } from 'src/websocket/websocket.init';

@WebSocketGateway({
  namespace: '/quiz',
  cors: {
    origin:
      process.env.NODE_ENV === 'production'
        ? `https://${process.env.DOMAIN || 'localhost'}`
        : ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  },
})
export class GameGateway implements OnGatewayInit, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    @Inject(forwardRef(() => GameService))
    private readonly gameService: GameService,
    @Inject(forwardRef(() => LobbyService))
    private readonly lobbyService: LobbyService,
    private readonly redisService: RedisService,
    private readonly jwtService: JwtService,
  ) {}

  afterInit(server: Server) {
    initWsAuth(server, this.jwtService);
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (!userId) return;

    // We check if the user is truly offline (no other sockets)
    // before we terminate their game session.
    const isOnline = await this.redisService.isUserOnline(userId);
    if (isOnline) return;

    const lobbyId = await this.lobbyService.getLobbyIdForUser(userId);
    if (lobbyId) {
      console.log(`[GameGateway] User ${userId} disconnected. Terminating game ${lobbyId}`);
      await this.gameService.quitGame(lobbyId, userId);
      await this.emitGameState(lobbyId);
    }
  }

  @SubscribeMessage('game:submit-topic')
  async handleSubmitTopic(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: SubmitTopicDto,
  ) {
    const userId = client.data.userId;

    try {
      await this.gameService.submitTopic(body.lobbyId, userId, {
        topicTitle: body.topicTitle,
        difficulty: body.difficulty,
      });
    } catch (err) {
      console.error('Error in submit-topic:', err);
      throw err;
    }

    await this.emitGameState(body.lobbyId);
    return { ok: true };
  }

  @SubscribeMessage('game:submit-vote')
  async handleSubmitVote(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: SubmitVoteDto,
  ) {
    const userId = client.data.userId as string;

    await this.gameService.submitVote(
      body.lobbyId,
      userId,
      body.votedForUserId,
    );

    await this.emitGameState(body.lobbyId);
    return { ok: true };
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
    return { ok: true };
  }

  @SubscribeMessage('game:sync')
  async onGameSync(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId;
    const lobbyId = await this.lobbyService.getLobbyIdForUser(userId);

    if (!lobbyId) return { ok: false };

    await client.join(lobbyId);

    const view = await this.gameService.getGameView(lobbyId);
    client.emit('game:state', view);

    return { ok: true };
  }

  @SubscribeMessage('game:quit')
  async onGameQuit(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId;

    const lobbyId = await this.lobbyService.getLobbyIdForUser(userId);
    if (!lobbyId) return { ok: false };

    // server-side state update
    await this.gameService.quitGame(lobbyId, userId);

    // Remove socket from room and notify client
    await client.leave(lobbyId);
    client.emit('game:quit-confirmed');

    // notify the remaining players
    await this.emitGameState(lobbyId);

    return { ok: true };
  }

  private async emitGameState(lobbyId: string) {
    const view = await this.gameService.getGameView(lobbyId);
    if (!view) {
      this.server.to(lobbyId).emit('game:terminated');
      return;
    }

    if (view.match.state == 'FINISHED') {
      this.server.to(lobbyId).emit('game:terminated', view);
    } else {
      this.server.to(lobbyId).emit('game:state', view);
    }
  }
}
