/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { RepositoryService } from '../repository/repository.service';

@Injectable()
export class CacheService {
  constructor(
    @Inject('REDIS') private readonly redis: Redis,
    private readonly repositoryService: RepositoryService,
  ) {}

  // adds to the redis database
  async createRoom(roomId: string, hostId: string) {
    await this.redis.hset(`quiz:room:${roomId}:meta`, {
      status: 'WAITING',
      round: 0,
      hostId: hostId,
    });

    await this.redis.sadd(`room:${roomId}:players`, hostId);
  }
  async getRoomState(roomId: string) {
    const meta = await this.redis.hgetall(`quiz:room:${roomId}:meta`);
    return meta;
  }
  async addPlayer(roomId: string, userId: string) {
    const exists = await this.redis.exists(`room:${roomId}:meta`);
    if (!exists) {
      throw new Error(`Room does not exist`);
    }

    await this.redis.sadd(`room:${roomId}:players`, userId);
  }
  // TODO! add functions for adding players, answers and questions. lock is to be implemented later
}
