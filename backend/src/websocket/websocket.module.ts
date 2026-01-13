import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConnectionGateway } from './websocket.gateway';

@Module({
    imports: [
        JwtModule.register({
            secret: process.env.JWT_SECRET,
        }),
    ],
    providers: [ConnectionGateway],
})
export class WebsocketModule {}
