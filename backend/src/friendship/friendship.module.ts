import { Module } from '@nestjs/common';
import { FriendshipController } from './friendship.controller';
import { FriendshipService } from './friendship.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { FriendshipGateway } from './friendship.gateway';

@Module({
  controllers: [FriendshipController],
  providers: [FriendshipService, FriendshipGateway, PrismaModule],
  exports: [FriendshipService],
})
export class FriendshipModule {}
