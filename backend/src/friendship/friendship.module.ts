import { Module } from '@nestjs/common';
import { FriendshipController } from './friendship.controller';
import { FriendshipService } from './friendship.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  controllers: [FriendshipController],
  providers: [FriendshipService, PrismaModule],
  exports: [FriendshipService],
})
export class FriendshipModule {}
