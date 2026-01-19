import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(RedisService.name);
    public readonly client: Redis;

    //on construction
    constructor() {
        const host = process.env.REDIS_HOST || 'cache_redis';
        const port = Number(process.env.REDIS_PORT) || 6379;

        // create host port connection; lazy connect prevents creashesd by not connecting immidiately
        this.client = new Redis({
            host,
            port,
            lazyConnect: true,
        });
    }

    // runs on backend start;  we try to connect to redis and log if the connection is alive
    async onModuleInit() {
        try {
            await this.client.connect();
            await this.client.ping();
            
            // Clear all socket tracking on startup to prevent ghost online statuses
            const keys = await this.client.keys('user:*:sockets');
            if (keys.length > 0) {
                await this.client.del(...keys);
                this.logger.log(`Cleared ${keys.length} stale socket sets from Redis`);
            }
            
            this.logger.log('Redis Connected');
        } catch (e: any) {
            this.logger.error(`Redus connection failed: ${e?.message ?? e}`);
        }
    }

    // disconnect client on closure
    async onModuleDestroy() {
        await this.client.quit();
    }

    async isUserOnline(userId: string): Promise<boolean> {
        try {
            const count = await this.client.scard(`user:${userId}:sockets`);
            return count > 0;
        } catch (e) {
            return false;
        }
    }

    async trackSocket(userId: string, socketId: string) {
        await this.client.sadd(`user:${userId}:sockets`, socketId);
        await this.client.expire(`user:${userId}:sockets`, 86400); // 24h safety
    }

    async untrackSocket(userId: string, socketId: string) {
        await this.client.srem(`user:${userId}:sockets`, socketId);
    }
}
