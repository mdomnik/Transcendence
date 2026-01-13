import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import * as cookie from 'cookie';

export function initWsAuth(server: Server, jwtService: JwtService) {
  server.use((socket: Socket, next) => {
    try {
      const rawCookie = socket.handshake.headers.cookie;
      if (!rawCookie) {
        throw new UnauthorizedException('No cookie found');
      }

      const parsed = cookie.parse(rawCookie);
      const token = parsed['access_token'];
      if (!token) {
        throw new UnauthorizedException('No access token in cookie');
      }

      const payload = jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });

      socket.data.userId = payload.sub;
      next();
    } catch (err) {
      next(new UnauthorizedException(err));
    }
  });
}
