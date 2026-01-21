import { Controller, Param, Post, Get, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FriendshipService } from './friendship.service';
import { User as UserDecorator } from 'src/common/decorators/user.decorator'

@UseGuards(AuthGuard('jwt'))
@Controller('friendship')
export class FriendshipController {
    constructor(private friendshipService: FriendshipService) {}

    @Get('list')
    getFriends(@UserDecorator('id') myId: string) {
        return this.friendshipService.friendsList(myId);
    }

    @Get('requests')
    getRequests(@UserDecorator('id') myId: string) {
        return this.friendshipService.pendingRequests(myId);
    }
    
    @Get('friends')
    friends(@UserDecorator('id') myId: string) {
        return this.friendshipService.friendsList(myId);
    }
    @Post('request/:userId')
    request(@UserDecorator('id') id: string, @Param('userId') userId: string) {
        return this.friendshipService.sendRequest(id, userId);
    }

    @Post('accept/:friendshipId')
    accept(@UserDecorator('id') myId: string, @Param('friendshipId', ParseUUIDPipe) friendshipId: string) {
        return this.friendshipService.accept(myId, friendshipId);
    }


    @Post('reject/:friendshipId')
    reject(@UserDecorator('id') myId: string, @Param('friendshipId', ParseUUIDPipe) friendshipId: string) {
        return this.friendshipService.reject(myId, friendshipId);
    }


    @Post('cancel/:userId')
    cancel(@UserDecorator('id') myId: string, @Param('userId', ParseUUIDPipe) userId: string) {
        return this.friendshipService.cancel(myId, userId);
    }

  @Post('block/:userId')
  block(@UserDecorator('id') myId: string, @Param('userId', ParseUUIDPipe) otherId: string) {
    return this.friendshipService.block(myId, otherId);
  }

  @Post('unblock/:userId')
  unblock(@UserDecorator('id') myId: string, @Param('userId', ParseUUIDPipe) otherId: string) {
    return this.friendshipService.unblock(myId, otherId);
  }

}
