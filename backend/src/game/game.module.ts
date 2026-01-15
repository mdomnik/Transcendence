import { Module } from '@nestjs/common';
import { GameService } from './game.service';
import { GameGateway } from './game.gateway';
import { RedisModule } from 'src/redis/redis.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { QuizModule } from 'src/quiz/quiz.module';

@Module({
  imports: [
    RedisModule,
    PrismaModule,
    QuizModule,
  ],
  providers: [GameService, GameGateway],
  exports: [GameService]
})
export class GameModule {}
