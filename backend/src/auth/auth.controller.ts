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
    async signup(@Body() dto: AuthDto, @Res() res: Response) {
        const result = await this.authService.signup(dto);
        
        // Set httpOnly cookie
        res.cookie('access_token', result.access_token, {
            httpOnly: true,
            sameSite: 'lax',
            secure: false,
            maxAge: 24 * 60 * 60 * 1000,
            path: '/',
            domain: 'localhost',
        });
        
        return res.status(201).json({ message: 'Signup successful' });
    }

    @Post('signin')
    async signin(@Body() dto: SignInDto, @Res() res: Response) {
        const result = await this.authService.signin(dto);
        
        // Set httpOnly cookie
        res.cookie('access_token', result.access_token, {
            httpOnly: true,
            sameSite: 'lax',
            secure: false,
            maxAge: 24 * 60 * 60 * 1000,
            path: '/',
            domain: 'localhost',
        });
        
        return res.status(200).json({ message: 'Login successful' });
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
        const { access_token } = await this.authService.signToken(user.username, user.id, user.email);
        res.cookie('access_token', access_token, {
          httpOnly: true,
          sameSite: 'lax',
          secure: false, // true in production
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
          path: '/',
          domain: 'localhost',
        });
        console.log("access token: ", access_token)
        // Send HTML with client-side redirect
        return res.send(`
          <html>
            <head>
              <script>
                window.location.href = 'http://localhost:8080/auth/callback';
              </script>
            </head>
            <body>
              <p>Redirecting...</p>
            </body>
          </html>
        `);
    }
}
