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

type LobbyState = 'WAITING' | 'IN_GAME' | 'FINISHED';

const DEFAULT_MATCH_CONFIG: MatchConfig = {
  roundsTotal: 3,
  timePerQuestion: 30,
  questionsPerRound: 5,
};
const DEFAULT_MIN_PLAYERS = 2;
const DEFAULT_MAX_PLAYERS = 4;

interface MatchConfig {
  roundsTotal: number;
  timePerQuestion: number;
  questionsPerRound: number;
  topic?: string;
  difficulty?: string;
  minPlayers?: number;
  maxPlayers?: number;
}

export interface LobbyView {
  lobbyId: string;
  lobbyCode: string;
  ownerId: string;
  state: LobbyState;
  config: MatchConfig;
  minPlayers: number;
  maxPlayers: number;
  members: Array<{
    userId: string;
    username: string;
    ready: boolean;
  }>;
}

@Injectable()
export class LobbyService {
  constructor(
    public readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  async getLobby(lobbyId: string): Promise<LobbyView> {
    const meta = await this.redis.client.hgetall(LobbyKeys.meta(lobbyId));
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

    const config: MatchConfig = {
      roundsTotal: Number(meta.roundsTotal),
      timePerQuestion: Number(meta.timePerQuestion),
      questionsPerRound: Number(meta.questionsPerRound),
      topic: meta.topic || '',
      difficulty: meta.difficulty || 'EASY',
    };

    const lobby = {
      lobbyId,
      lobbyCode: meta.lobbyCode,
      ownerId: meta.ownerId,
      state: meta.state as LobbyState,
      config,
      minPlayers: Number(meta.minPlayers ?? DEFAULT_MIN_PLAYERS),
      maxPlayers: Number(meta.maxPlayers ?? DEFAULT_MAX_PLAYERS),
      members,
    };
    return lobby;
  }

  async createLobby(ownerId: string): Promise<LobbyView> {
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

    const lobbyCode = await this.generateLobbyCode(8);

    console.log('lobbycode generated');

    await this.redis.client.hset(LobbyKeys.meta(lobbyId), {
      ownerId,
      lobbyCode,
      state: 'WAITING',
      createdAt: Date.now(),
      roundsTotal: DEFAULT_MATCH_CONFIG.roundsTotal.toString(),
      timePerQuestion: DEFAULT_MATCH_CONFIG.timePerQuestion.toString(),
      questionsPerRound: DEFAULT_MATCH_CONFIG.questionsPerRound.toString(),
      topic: '',
      difficulty: 'EASY',
      minPlayers: DEFAULT_MIN_PLAYERS.toString(),
      maxPlayers: DEFAULT_MAX_PLAYERS.toString(),
    });

    await this.redis.client.set(LobbyKeys.lobbyCode(lobbyCode), lobbyId);

    await this.redis.client.sadd(LobbyKeys.members(lobbyId), ownerId);
    await this.redis.client.hset(LobbyKeys.ready(lobbyId), ownerId, '0');

    await this.redis.client.set(LobbyKeys.userLobby(ownerId), lobbyId);

    await this.refreshTTL(lobbyId);

    return this.getLobby(lobbyId);
  }

  async joinLobby(lobbyId: string, userId: string): Promise<LobbyView> {
    const meta = await this.redis.client.hgetall(LobbyKeys.meta(lobbyId));
    if (!meta?.ownerId) throw new NotFoundException('Lobby not found');

    if (meta.state !== 'WAITING')
      throw new ForbiddenException('Lobby is not joinable');

    const isBanned = await this.redis.client.sismember(
      LobbyKeys.banned(lobbyId),
      userId,
    );

    if (isBanned) {
      throw new ForbiddenException('BANNED_FROM_LOBBY');
    }

    const memberCount = await this.redis.client.scard(
      LobbyKeys.members(lobbyId),
    );

    const maxPlayers = Number(meta.maxPlayers ?? DEFAULT_MAX_PLAYERS);

    if (memberCount >= maxPlayers) {
      throw new ForbiddenException('LOBBY_FULL');
    }

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

  async leaveLobby(lobbyId: string, userId: string): Promise<LobbyView | null> {
    const meta = await this.redis.client.hgetall(LobbyKeys.meta(lobbyId));
    if (!meta?.ownerId) throw new NotFoundException('Lobby not found');

    // Instead of commenting this out the proper behavior should be the game server
    // should be turning the lobby state from finished to waiting!
    // if (meta.state !== 'WAITING')
    //   throw new ForbiddenException('Cannot leave during an active game');

    const isMember = await this.redis.client.sismember(
      LobbyKeys.members(lobbyId),
      userId,
    );
    if (!isMember) {
      throw new ForbiddenException('User is not a member of this lobby');
    }

    return this.removeMember(lobbyId, userId);
  }

  async kickPlayer(
    lobbyId: string,
    ownerId: string,
    targetUserId: string,
  ): Promise<LobbyView | null> {
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

  private async removeMember(
    lobbyId: string,
    userId: string,
  ): Promise<LobbyView | null> {
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

  async setReady(
    lobbyId: string,
    userId: string,
    ready: boolean,
  ): Promise<LobbyView> {
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

  async startGame(lobbyId: string, userId: string): Promise<LobbyView> {

    const meta = await this.redis.client.hgetall(LobbyKeys.meta(lobbyId));

    if (!meta?.ownerId)
        throw new NotFoundException('Lobby not Found');

    if (meta.ownerId !== userId)
      throw new ForbiddenException('Only lobby owner can start the game');

    if (meta.state !== 'WAITING')
      throw new ForbiddenException(
        `Game already started`,
      );

    const members = await this.redis.client.smembers(
      LobbyKeys.members(lobbyId),
    );

    const minPlayers = Number(meta.minPlayers ?? DEFAULT_MIN_PLAYERS);

    if (members.length < minPlayers) {
      throw new ForbiddenException('NOT_ENOUGH_PLAYERS');
    }

    const readyMap = await this.redis.client.hgetall(LobbyKeys.ready(lobbyId));
    const allReady = members.every((id) => readyMap[id] === '1');

    if (!allReady)
        throw new ForbiddenException('Not all players are ready');

    await this.redis.client.hset(LobbyKeys.meta(lobbyId), {
        state: 'IN_GAME',
    });

    await this.refreshTTL(lobbyId);

    return this.getLobby(lobbyId);
  }

  async retryLobby(lobbyId: string, userId: string): Promise<LobbyView> {
    const meta = await this.redis.client.hgetall(LobbyKeys.meta(lobbyId));
    if (!meta?.ownerId) throw new NotFoundException('Lobby not Found');

    if (meta.ownerId !== userId) {
      throw new ForbiddenException('Only the host can restart the game');
    }

    // Reset lobby state
    await this.redis.client.hset(LobbyKeys.meta(lobbyId), {
      state: 'WAITING',
    });

    // Reset ready status for all members
    await this.redis.client.del(LobbyKeys.ready(lobbyId));
    // Initialize everyone to unready
    const members = await this.redis.client.smembers(LobbyKeys.members(lobbyId));
    for (const id of members) {
      await this.redis.client.hset(LobbyKeys.ready(lobbyId), id, '0');
    }

    await this.refreshTTL(lobbyId);

    return this.getLobby(lobbyId);
  }

  private async refreshTTL(lobbyId: string) {
    const ttl = 3600;

    const meta = await this.redis.client.hgetall(LobbyKeys.meta(lobbyId));
    if (!meta?.lobbyCode) return;

    await this.redis.client.expire(LobbyKeys.meta(lobbyId), ttl);
    await this.redis.client.expire(LobbyKeys.members(lobbyId), ttl);
    await this.redis.client.expire(LobbyKeys.ready(lobbyId), ttl);

    await this.redis.client.expire(LobbyKeys.lobbyCode(meta.lobbyCode), ttl);

    const members = await this.redis.client.smembers(
      LobbyKeys.members(lobbyId),
    );
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

    if (meta?.lobbyCode) {
      await this.redis.client.del(LobbyKeys.lobbyCode(meta.lobbyCode));
    }

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
    const lobbyId = await this.redis.client.get(LobbyKeys.userLobby(userId));
    if (!lobbyId) return null;

    // Check if the lobby actually exists
    const exists = await this.redis.client.exists(LobbyKeys.meta(lobbyId));
    if (!exists) {
      // Self-healing: remove stale reference
      await this.redis.client.del(LobbyKeys.userLobby(userId));
      return null;
    }

    return lobbyId;
  }

  private async generateLobbyCode(codeLength: number) {
    const characters: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result: string = '';

    for (let i = 0; i < codeLength; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      result += characters.charAt(randomIndex);
    }

    return result;
  }

  async findLobbyIdFromLobbyCode(lobbyCode: string) {
    const lobbyId = await this.redis.client.get(LobbyKeys.lobbyCode(lobbyCode));

    return lobbyId ?? null;
  }

  async updateMatchConfig(
    lobbyId: string,
    userId: string,
    key: keyof MatchConfig,
    delta?: number,
    value?: string,
  ): Promise<LobbyView> {
    const meta = await this.redis.client.hgetall(LobbyKeys.meta(lobbyId));

    if (!meta?.ownerId) throw new NotFoundException('Lobby not found');

    if (meta.ownerId !== userId)
      throw new ForbiddenException('Only owner can change config');

    if (meta.state !== 'WAITING')
      throw new ForbiddenException('Cannot change config after game start');

    if (key === 'topic' || key === 'difficulty') {
      if (value === undefined) return this.getLobby(lobbyId);

      await this.redis.client.hset(LobbyKeys.meta(lobbyId), {
        [key]: value,
      });
      await this.refreshTTL(lobbyId);
      return this.getLobby(lobbyId);
    }

    const current = Number(meta[key]);

    let next = current + (delta ?? 0);

    switch (key) {
      case 'roundsTotal':
        next = Math.min(15, Math.max(1, next));
        break;
      case 'questionsPerRound':
        next = Math.min(5, Math.max(1, next));
        break;
      case 'timePerQuestion':
        next = Math.min(60, Math.max(10, next));
        break;
      case 'minPlayers':
        next = Math.min(4, Math.max(2, next));
        break;
      case 'maxPlayers':
        next = Math.min(8, Math.max(2, next));
        break;
    }

    if (key === 'maxPlayers') {
      const minP = Number(meta.minPlayers ?? DEFAULT_MIN_PLAYERS);
      if (next < minP) next = minP;
    }
    if (key === 'minPlayers') {
      const maxP = Number(meta.maxPlayers ?? DEFAULT_MAX_PLAYERS);
      if (next > maxP) next = maxP;
    }

    if (next === current) return this.getLobby(lobbyId);

    await this.redis.client.hset(LobbyKeys.meta(lobbyId), {
      [key]: next.toString(),
    });

    await this.refreshTTL(lobbyId);
    return this.getLobby(lobbyId);
  }

  async banPlayer(
    lobbyId: string,
    ownerId: string,
    targetUserId: string,
  ): Promise<LobbyView | null> {
    const meta = await this.redis.client.hgetall(LobbyKeys.meta(lobbyId));
    if (!meta?.ownerId) throw new NotFoundException('Lobby not found');

    if (meta.ownerId !== ownerId)
      throw new ForbiddenException('Only owner can ban players');

    await this.redis.client.sadd(LobbyKeys.banned(lobbyId), targetUserId);

    return this.removeMember(lobbyId, targetUserId);
  }
}
