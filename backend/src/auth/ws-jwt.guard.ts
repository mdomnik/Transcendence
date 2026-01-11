import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Socket } from "socket.io";

@Injectable()
export class WsJwtGuard implements CanActivate {
    constructor(private readonly jwtService: JwtService) {}

    canActivate(context: ExecutionContext): boolean {
        const client = context.switchToWs().getClient<Socket>();
        const auth = client.handshake.headers['authorization']

        
        if (!auth)
            return false;
        
        const token = auth.split(' ')[1];
        console.log("client");
        const payload = this.jwtService.verify(token);

        client.data.userId = payload.sub;
        return true;
    }
}