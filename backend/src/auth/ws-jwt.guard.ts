import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    console.log('jwt');
    const client = context.switchToWs().getClient<Socket>();
    const auth = client.handshake.headers['authorization'];

    if (!auth) return false;

    const token = auth.split(' ')[1];

    try {
      const payload = this.jwtService.verify(token);
      client.data.userId = payload.sub;
      return true;
    } catch (err) {
      console.log('crash!');
      return false;
    }
  }
}
