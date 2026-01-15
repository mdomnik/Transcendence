import { Controller, Get, UseGuards, Param, Query, Patch, Body } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { User as UserDecorator } from 'src/common/decorators/user.decorator';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
  constructor(private usersService: UserService) {}

    @Get('me')
    @UseGuards(AuthGuard('jwt'))
    getMe(@UserDecorator() user: { id: string }) {
        return this.usersService.getMe(user.id);
    }

    @Patch('me')
    @UseGuards(AuthGuard('jwt'))
    updateMe(
        @UserDecorator() user: { id: string },
        @Body() body: { username?: string; avatarUrl?: string },
    ) {
        return this.usersService.updateProfile(user.id, body);
    }

    @Get('search')
    searchUsers(
        @Query('query') query: string,
        @UserDecorator('id') id: string,
    ) {
        return this.usersService.searchUsers(query, id);
    }
    
    @Get(':userId')
    getPublicProfile(@Param('userId') userId: string) {
    return this.usersService.getPublicProfile(userId);
  }

//   @Get('username/:username')
//   getIdFromUsername(@Param('username') username: string) {
//     return this.usersService.getIdFromUsername(username);
//   }
}
