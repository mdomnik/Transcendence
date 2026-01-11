import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(RedisService.name);
    public readonly client: Redis;

    //on construction
    constructor() {
        const host = process.env.REDIS_HOST;
        const port = Number(process.env.REDIS_PORT);

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
            this.logger.log('Redis Connected');
        } catch (e: any) {
            this.logger.error(`Redus connection failed: ${e?.message ?? e}`);
        }
    }

    // disconnect client on closure
    async onModuleDestroy() {
        await this.client.quit();
    }

}
