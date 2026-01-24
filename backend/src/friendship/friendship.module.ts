import { forwardRef, Module } from '@nestjs/common';
import { FriendshipController } from './friendship.controller';
import { FriendshipService } from './friendship.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { FriendshipGateway } from './friendship.gateway';
import { RedisModule } from 'src/redis/redis.module';
import { LobbyModule } from 'src/lobby/lobby.module';
import { ChatModule } from 'src/chat/chat.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [PrismaModule, RedisModule, JwtModule.register({}), forwardRef(() => LobbyModule), ChatModule],
  controllers: [FriendshipController],
  providers: [FriendshipService, FriendshipGateway],
  exports: [FriendshipService],
})
export class FriendshipModule {}
