import { Module } from '@nestjs/common';
import { LobbyService } from './lobby.service';
import { LobbyController } from './lobby.controller';
import { RedisModule } from 'src/redis/redis.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { LobbyGateway } from './lobby.gateway';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [RedisModule, AuthModule],
  providers: [
    LobbyService,
    LobbyGateway,
    PrismaService,
  ],
  controllers: [LobbyController]
})
export class LobbyModule {}
