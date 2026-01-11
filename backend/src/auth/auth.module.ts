import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { JwtStrategy } from './strategy';
import { GoogleStrategy } from './strategy/google.strategy';
import { UserModule } from 'src/user/user.module';
import { WsJwtGuard } from './ws-jwt.guard';

@Module({
  imports: [JwtModule.register({}), ConfigModule, UserModule],
  providers: [AuthService, WsJwtGuard, JwtStrategy, GoogleStrategy],
  controllers: [AuthController],
  exports: [
    WsJwtGuard,
    JwtModule
  ]
})
export class AuthModule {}
