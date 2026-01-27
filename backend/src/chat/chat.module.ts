import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { PrismaModule } from 'src/prisma/prisma.module';
import { RedisModule } from 'src/redis/redis.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [PrismaModule, RedisModule, JwtModule.register({})],
  providers: [ChatService, ChatGateway],
  exports: [ChatService],
})
export class ChatModule {}
