import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthDto, SignInDto } from './dto';
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
    signin(@Body() dto: SignInDto) {
        return this.authService.signin(dto);
    }
    
    @Post('logout')
    logout(@Res() res: Response) {
        res.clearCookie('access_token', {
            httpOnly: true,
            sameSite: 'lax',
            secure: false,
            path: '/',
        });
        return res.status(200).json({ message: 'Logged out successfully' });
    }

    @Get('google/login')
    @UseGuards(GoogleAuthGuard)
    handleLogin(){

    }

    @Get('google/redirect')
    @UseGuards(GoogleAuthGuard)
    async handleRedirect(@User() user, @Res() res: Response) {
        // const user = await this.authService.handleGoogleLogin(googleUser);
        const accessToken = await this.authService.signToken(user.username, user.id, user.email);
        res.cookie('access_token', accessToken, {
          httpOnly: true,
          sameSite: 'lax',
          secure: false, // true in production
          maxAge: 15 * 60 * 1000,
        });
        console.log("access token: ", accessToken)
        // Redirect to homepage - frontend will check auth and redirect to dashboard
        return res.redirect('http://localhost:8080/');
    }
}
