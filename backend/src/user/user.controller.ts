import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { User } from 'src/common/decorators/user.decorator';

@Controller('users')
export class UserController {
    @UseGuards(AuthGuard('jwt'))
    @Get('me')
    getMe(@User() user) {
        return {
            id: user.id,
            email: user.email,
            username: user.username,
        }
    }
}
