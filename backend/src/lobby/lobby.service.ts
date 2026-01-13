/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/redis/redis.service';
import { LobbyKeys } from './lobby.keys';

type LobbyState = 'WAITING' | 'SETUP' | 'IN_GAME' | 'FINISHED';

export interface LobbyView {
  lobbyId: string;
  ownerId: string;
  state: LobbyState;
  members: Array<{
    userId: string;
    username: string;
    ready: boolean;
  }>;
}

@Injectable()
export class LobbyService {
  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}
  
  async getLobby(lobbyId: string): Promise<LobbyView> {
    const meta = await this.redis.client.hgetall(LobbyKeys.meta(lobbyId));
    console.log(`[LobbyService] Meta check:`, meta);
    if (!meta?.ownerId) throw new NotFoundException('Lobby not Found');

    const memberIds = await this.redis.client.smembers(
      LobbyKeys.members(lobbyId),
    );
    const readyMap = await this.redis.client.hgetall(LobbyKeys.ready(lobbyId));

    const users = await this.prisma.user.findMany({
      where: { id: { in: memberIds } },
      select: { id: true, username: true },
    });

    const members = users
    .map((u) => ({
      userId: u.id,
      username: u.username,
      ready: readyMap[u.id] === '1',
    }))
    .sort((a, b) => (a.userId == meta.ownerId ? -1 : 1));

    const lobby = {
      lobbyId,
      ownerId: meta.ownerId,
      state: meta.state as LobbyState,
      members,
    };
    console.log(`[LobbyService] Returning lobby: ${lobbyId}`);
    return lobby;
  }
  
  async createLobby(ownerId: string): Promise <LobbyView> {
    const owner = await this.prisma.user.findUnique({
      where: { id: ownerId },
      select: { id: true },
    });

    if (!owner) throw new NotFoundException('Owner user not found');

    const existingLobby = await this.redis.client.get(
      LobbyKeys.userLobby(ownerId),
    );
    if (existingLobby)
      throw new ForbiddenException('User is already in a lobby');

    const lobbyId = randomUUID();

    await this.redis.client.hset(LobbyKeys.meta(lobbyId), {
      ownerId,
      state: 'WAITING',
      createdAt: Date.now(),
    });

    await this.redis.client.sadd(LobbyKeys.members(lobbyId), ownerId);
    await this.redis.client.hset(LobbyKeys.ready(lobbyId), ownerId, '0');

    await this.redis.client.set(LobbyKeys.userLobby(ownerId), lobbyId);

    await this.refreshTTL(lobbyId);

    return this.getLobby(lobbyId);
  }


  async joinLobby(lobbyId: string, userId: string): Promise <LobbyView> {
    const meta = await this.redis.client.hgetall(LobbyKeys.meta(lobbyId));
    if (!meta?.ownerId) throw new NotFoundException('Lobby not found');

    if (meta.state !== 'WAITING')
      throw new ForbiddenException('Lobby is not joinable');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) throw new NotFoundException('User not found');

    const existingLobby = await this.redis.client.get(
      LobbyKeys.userLobby(userId),
    );
    if (existingLobby)
      throw new ForbiddenException('User is already in a lobby');

    const alreadyMember = await this.redis.client.sismember(
        LobbyKeys.members(lobbyId),
        userId,
    );

    if (alreadyMember) {
        await this.refreshTTL(lobbyId);
        return this.getLobby(lobbyId);
    }

    await this.redis.client.sadd(LobbyKeys.members(lobbyId), userId);
    await this.redis.client.hset(LobbyKeys.ready(lobbyId), userId, '0');

    await this.redis.client.set(LobbyKeys.userLobby(userId), lobbyId);

    await this.refreshTTL(lobbyId);

    return this.getLobby(lobbyId);
  }

  async leaveLobby(lobbyId: string, userId: string): Promise <LobbyView | null> {
    const meta = await this.redis.client.hgetall(LobbyKeys.meta(lobbyId));
    if (!meta?.ownerId) throw new NotFoundException('Lobby not found');

    if (meta.state !== 'WAITING')
      throw new ForbiddenException('Cannot leave during an active game');

    const isMember = await this.redis.client.sismember(
      LobbyKeys.members(lobbyId),
      userId,
    );
    if (!isMember) {
      throw new ForbiddenException('User is not a member of this lobby');
    }

    return this.removeMember(lobbyId, userId);
  }

  async kickPlayer(lobbyId: string, ownerId: string, targetUserId: string): Promise<LobbyView | null> {
    const meta = await this.redis.client.hgetall(LobbyKeys.meta(lobbyId));
    if (!meta?.ownerId) throw new NotFoundException('Lobby not found');

    if (meta.ownerId !== ownerId) {
      throw new ForbiddenException('Only lobby owner can kick players');
    }

    if (ownerId === targetUserId) {
      throw new ForbiddenException('Owner cannot kick themselves');
    }

    if (meta.state !== 'WAITING') {
      throw new ForbiddenException('Cannot kick players during an active game');
    }

    const isMember = await this.redis.client.sismember(
      LobbyKeys.members(lobbyId),
      targetUserId,
    );
    if (!isMember) {
      throw new NotFoundException('User is not in this lobby');
    }

    return this.removeMember(lobbyId, targetUserId);
  }

  private async removeMember(lobbyId: string, userId: string): Promise<LobbyView | null> {
    await this.redis.client.srem(LobbyKeys.members(lobbyId), userId);
    await this.redis.client.hdel(LobbyKeys.ready(lobbyId), userId);
    await this.redis.client.del(LobbyKeys.userLobby(userId));

    const remainingPlayers = await this.redis.client.smembers(
      LobbyKeys.members(lobbyId),
    );

    if (remainingPlayers.length === 0) {
      await this.destroyLobby(lobbyId);
      return null;
    }

    const meta = await this.redis.client.hgetall(LobbyKeys.meta(lobbyId));
    if (meta.ownerId === userId) {
      const newOwnerId = remainingPlayers[0];

      await this.redis.client.hset(LobbyKeys.meta(lobbyId), {
        ownerId: newOwnerId,
      });
    }

    await this.refreshTTL(lobbyId);

    return this.getLobby(lobbyId);
  }

  async setReady(lobbyId: string, userId: string, ready: boolean): Promise <LobbyView> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) throw new NotFoundException('User not found');

    const isMember = await this.redis.client.sismember(
      LobbyKeys.members(lobbyId),
      userId,
    );
    if (!isMember) throw new ForbiddenException('Not a Lobby member');

    await this.redis.client.hset(
      LobbyKeys.ready(lobbyId),
      userId,
      ready ? '1' : '0',
    );

    await this.refreshTTL(lobbyId);

    return this.getLobby(lobbyId);
  }

  async startSetup(lobbyId: string, userId: string): Promise <LobbyView> {
    const meta = await this.redis.client.hgetall(LobbyKeys.meta(lobbyId));
    if (!meta?.ownerId) throw new NotFoundException('Lobby not Found');
    if (meta.ownerId !== userId)
      throw new ForbiddenException('Only lobby owner can start the game');
    
    // If already in SETUP or IN_GAME, just return the current lobby
    if (meta.state === 'SETUP' || meta.state === 'IN_GAME') {
      return this.getLobby(lobbyId);
    }

    if (meta.state !== 'WAITING')
      throw new ForbiddenException(`Cannot start game from state: ${meta.state}`);

    //ensure everyone is ready
    const members = await this.redis.client.smembers(
      LobbyKeys.members(lobbyId),
    );
    const readyMap = await this.redis.client.hgetall(LobbyKeys.ready(lobbyId));
    const allReady = members.every((id) => readyMap[id] === '1');

    if (!allReady) throw new ForbiddenException('Not all players are ready');

    await this.redis.client.hset(LobbyKeys.meta(lobbyId), { state: 'SETUP' });

    await this.refreshTTL(lobbyId);

    return this.getLobby(lobbyId);
  }

  private async refreshTTL(lobbyId: string) {
    const ttl = 3600;
    await this.redis.client.expire(LobbyKeys.meta(lobbyId), ttl);
    await this.redis.client.expire(LobbyKeys.members(lobbyId), ttl);
    await this.redis.client.expire(LobbyKeys.ready(lobbyId), ttl);

    const members = await this.redis.client.smembers(LobbyKeys.members(lobbyId));
    for (const userId of members) {
        await this.redis.client.expire(LobbyKeys.userLobby(userId), ttl);
    }
  }

  async clearLobbyForUsers(lobbyId: string) {
    const members = await this.redis.client.smembers(
      LobbyKeys.members(lobbyId),
    );
    for (const userId of members)
      await this.redis.client.del(LobbyKeys.userLobby(userId));
  }

  async destroyLobby(lobbyId: string) {
    const meta = await this.redis.client.hgetall(LobbyKeys.meta(lobbyId));
    if (!meta?.ownerId) throw new NotFoundException('Lobby not Found');

    const members = await this.redis.client.smembers(
      LobbyKeys.members(lobbyId),
    );

    for (const userId of members) {
      await this.redis.client.del(LobbyKeys.userLobby(userId));
    }

    await this.redis.client.del(
      LobbyKeys.meta(lobbyId),
      LobbyKeys.members(lobbyId),
      LobbyKeys.ready(lobbyId),
    );

    return `Destroyed lobby: ${lobbyId}`;
  }

  async getLobbyIdForUser(userId: string): Promise<string | null> {
    const lobbyId = await this.redis.client.get(
        LobbyKeys.userLobby(userId),
    );

    return lobbyId ?? null;
  }
}
