import { forwardRef, Module } from '@nestjs/common';
import { GameService } from './game.service';
import { RedisModule } from 'src/redis/redis.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { QuizModule } from 'src/quiz/quiz.module';
import { GameGateway } from './game.gateway';
import { LobbyModule } from 'src/lobby/lobby.module';
import { GameTicker } from './game.ticker';
import { LeaderboardModule } from 'src/leaderboard/leaderboard.module';

@Module({
  imports: [
    RedisModule,
    PrismaModule,
    QuizModule,
    LeaderboardModule,
    forwardRef(() => LobbyModule),
  ],
  providers: [GameService, GameTicker, GameGateway],
  exports: [GameService],
})
export class GameModule {}
