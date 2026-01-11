import { Controller, Get } from '@nestjs/common';
import { RedisService } from './redis.service';

@Controller('redis-test')
export class RedisController {
    constructor(private readonly redis: RedisService) {}

    // Adds status to cache that esxpires after 30s
    // Retrieves the status and returns it
    @Get()
    async test() {
        await this.redis.client.set('health:redis', 'OK', 'EX', 30);
        const v = await this.redis.client.get('health:redis');
        return { ok: true, value: v };
    }
}
