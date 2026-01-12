import { Controller, Get, UseGuards, Param, Query } from '@nestjs/common';
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

  
    

}

