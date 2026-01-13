
import { WebSocketGateway, WebSocketServer, SubscribeMessage, ConnectedSocket, MessageBody } from '@nestjs/websockets'
import { Server, Socket } from "socket.io";
import { GameService } from "./game.service";
import { ConfigGameDto, SubmitTopicDto, SubmitVoteDto, SubmitAnswerDto } from './dto';
import { LobbyDto } from 'src/lobby/dto';

@WebSocketGateway({
  namespace: '/quiz',
})
export class GameGateway {
    @WebSocketServer()
    server: Server;

    constructor(private readonly gameService: GameService) {}

    @SubscribeMessage('game:set_config')
    async handleSetConfig(
        @ConnectedSocket() client: Socket,
        @MessageBody() body: ConfigGameDto
    ) {
        const userId = client.data.userId;

        const config = {
            roundsTotal: body.config.roundTotal,
            timePerQuestion: body.config.timePerQuestion,
            questionsPerRound: body.config.questionsPerRound,
        }
        await this.gameService.setMatchConfig(
            body.lobbyId,
            userId,
            config,
        );

        await this.emitGameState(body.lobbyId);
    }

    @SubscribeMessage('game:start_match')
    async handleStartMatch(
        @ConnectedSocket() client: Socket,
        @MessageBody() body: LobbyDto
    ) {
        const userId = client.data.userId;

        await this.gameService.startMatch(body.lobbyId, userId);

        await this.emitGameState(body.lobbyId);
    }

    @SubscribeMessage('game:submit_topic')
    async handleSubmitTopic(
        @ConnectedSocket() client: Socket,
        @MessageBody() body: SubmitTopicDto
    ) {
        const userId = client.data.userId;

        await this.gameService.submitTopic(body.lobbyId, userId, {
            topicTitle: body.topicTitle,
            difficulty: body.difficulty,
        });

        await this.emitGameState(body.lobbyId);
    }

    @SubscribeMessage('game:submit_vote')
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

    @SubscribeMessage('game:submit_answer')
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

    private async emitGameState(lobbyId: string) {
        const view = await this.gameService.getGameView(lobbyId);
        if (!view)
            return;
        this.server.to(lobbyId).emit('game:state', view);
    }
}