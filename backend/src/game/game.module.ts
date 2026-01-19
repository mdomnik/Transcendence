import { forwardRef, Module } from '@nestjs/common';
import { GameService } from './game.service';
import { RedisModule } from 'src/redis/redis.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { QuizModule } from 'src/quiz/quiz.module';
import { GameGateway } from './game.gateway';
import { LobbyModule } from 'src/lobby/lobby.module';
import { GameTicker } from './game.ticker';

@Module({
  imports: [
    RedisModule,
    PrismaModule,
    QuizModule,
    forwardRef(() => LobbyModule),
  ],
  providers: [GameService, GameTicker, GameGateway],
  exports: [GameService],
})
export class GameModule {}
