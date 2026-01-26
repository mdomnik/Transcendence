import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import * as cookie from 'cookie';

export function initWsAuth(server: Server, jwtService: JwtService) {
  server.use((socket: Socket, next) => {
    try {
      const rawCookie = socket.handshake.headers.cookie;
      // console.log(`[initWsAuth] Handshake attempt. Cookie present: ${!!rawCookie}`);
      
      if (!rawCookie) {
        // console.error('[initWsAuth] No cookie found in handshake');
        throw new UnauthorizedException('No cookie found');
      }

      const parsed = cookie.parse(rawCookie);
      const token = parsed['access_token'];
      
      if (!token) {
        // console.error('[initWsAuth] access_token missing in cookie');
        throw new UnauthorizedException('No access token in cookie');
      }

      const payload = jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });

      // console.log(`[initWsAuth] Verified user: ${payload.sub}`);
      socket.data.userId = payload.sub;
      next();
    } catch (err) {
      // console.error(`[initWsAuth] Auth failed: ${err.message}`);
      next(new UnauthorizedException(err));
    }
  });
}
