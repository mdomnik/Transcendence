import { Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { RedisService } from 'src/redis/redis.service';
import { GameService } from './game.service';
import { GameKeys } from './game.keys';

@Injectable()
export class GameTicker {
  constructor(
    private readonly redis: RedisService,
    private readonly gameService: GameService,
  ) {}

  @Interval(500)
  async tick() {
    const activeMatches = await this.redis.client.smembers(GameKeys.activeMatches());

    for (const lobbyId of activeMatches) {
      try {
        const changed = await this.gameService.checkPhaseTimeout(lobbyId);
        if (changed) {
          await this.redis.client.publish(
            GameKeys.eventsChannel(),
            JSON.stringify({ lobbyId }),
          );
        }
      } catch (err) {
        console.error('[GameTicker] error', lobbyId, err);
      }
    }
  }
}
