import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConnectionGateway } from './websocket.gateway';
import { RedisModule } from 'src/redis/redis.module';
import { FriendshipModule } from 'src/friendship/friendship.module';

@Module({
    imports: [
        JwtModule.register({
            secret: process.env.JWT_SECRET,
        }),
        RedisModule,
        FriendshipModule,
    ],
    providers: [ConnectionGateway],
})
export class WebsocketModule {}
