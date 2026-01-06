import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategy';
import { GoogleStrategy } from './strategy/google.strategy';
import { UserController } from 'src/user/user.controller';

@Module({
  imports: [JwtModule.register({})],
  providers: [AuthService, JwtStrategy, GoogleStrategy],
  controllers: [AuthController, UserController],
})
export class AuthModule {}
