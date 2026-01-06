import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthDto } from './dto';
import { GoogleAuthGuard } from './strategy/Guards';
import type { Request, Response } from 'express';
import { User } from 'src/common/decorators/user.decorator';


@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) {}

    @Post('signup')
    signup(@Body() dto: AuthDto) {
        return this.authService.signup(dto);
    }

    @Post('signin')
    signin(@Body() dto: AuthDto) {
        return this.authService.signin(dto);
    }

    @Get('google/login')
    @UseGuards(GoogleAuthGuard)
    handleLogin(){

    }

    @Get('google/redirect')
    @UseGuards(GoogleAuthGuard)
    async handleRedirect(@User() user, @Res() res: Response) {
        // const user = await this.authService.handleGoogleLogin(googleUser);
        const accessToken = await this.authService.signToken(user.id, user.email);
        res.cookie('access_token', accessToken, {
          httpOnly: true,
          sameSite: 'lax',
          secure: false, // true in production
          maxAge: 15 * 60 * 1000,
        });
        console.log("access token: ", accessToken)
        // TO DO 
        // properly connect with front end
        //access token has to work
        return res.redirect('http://localhost:8080/dashboard');
    }
}
