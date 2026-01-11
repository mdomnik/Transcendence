import { Controller, Get, UseGuards, Param } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { User as UserDecorator } from 'src/common/decorators/user.decorator';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
  constructor(private usersService: UserService) { }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  getMe(@UserDecorator() user: { id: string }) {
    return this.usersService.getMe(user.id);
  }

  @Get(':userId')
  getPublicProfile(@Param('id') id: string) {
    return this.usersService.getPublicProfile(id);
  }

  @Get('username/:username')
  getIdFromUsername(@Param('username') username: string) {
    return this.usersService.getIdFromUsername(username);
  }


}

