import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UserController } from './user/user.controller';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { QuizModule } from './quiz/quiz.module';
import { PublicApiModule } from './public-api/public-api.module';
import { ParserModule } from './parser/parser.module';;
import { UserModule } from './user/user.module';
import { RedisModule } from './redis/redis.module';
import { LobbyModule } from './lobby/lobby.module';
import { GameModule } from './game/game.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'base',
          ttl: 60000,
          limit: 10,
        },
      ],
    }),
    PrismaModule,
    AuthModule,
    QuizModule,
    PublicApiModule,
    ParserModule,
    UserModule,
    LobbyModule,
    RedisModule,
    GameModule
  ],
  controllers: [AppController, UserController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard
    },
  ],
})
export class AppModule { }
