/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class CacheService {
  constructor(@Inject('REDIS') private readonly redis: Redis) {}

  // adds to the redis database
  async createRoom(roomId: string) {
    await this.redis.hset(`quiz:room:${roomId}:meta`, {
      status: 'WAITING',
      round: 0,
    });
    // await this.redis.expire(`quiz:room:${roomId}:meta`, 1800);
  }
  async getRoomState(roomId: string) {
    const meta = await this.redis.hgetall(`quiz:room:${roomId}:meta`);
    return meta;
  }
  // TODO! add functions for adding players, answers and questions. lock is to be implemented later
}