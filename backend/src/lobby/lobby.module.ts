import { forwardRef, Module } from '@nestjs/common';
import { LobbyService } from './lobby.service';
import { LobbyController } from './lobby.controller';
import { RedisModule } from 'src/redis/redis.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { LobbyGateway } from './lobby.gateway';
import { AuthModule } from 'src/auth/auth.module';
import { GameModule } from 'src/game/game.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [RedisModule, AuthModule, JwtModule.register({}), forwardRef(() => GameModule)],
  providers: [LobbyService, LobbyGateway, PrismaService],
  controllers: [LobbyController],
  exports: [LobbyService],
})
export class LobbyModule {}
