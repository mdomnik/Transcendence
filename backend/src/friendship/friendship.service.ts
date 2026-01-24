
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { FriendStatus } from 'generated/prisma/enums';
import { RedisService } from 'src/redis/redis.service';
import { LobbyService } from 'src/lobby/lobby.service';
import { ChatService } from 'src/chat/chat.service';

@Injectable()
export class FriendshipService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly chatService: ChatService,
    @Inject(forwardRef(() => LobbyService))
    private readonly lobbyService: LobbyService,
  ) {}


  private pair(a: string, b: string) {
    return a < b ? { userAId: a, userBId: b } : { userAId: b, userBId: a };
  }

  private isParticipant(myId: string, row: { userAId: string; userBId: string }) {
    return row.userAId === myId || row.userBId === myId;
  }

  private otherUserId(myId: string, row: { userAId: string; userBId: string }) {
    return row.userAId === myId ? row.userBId : row.userAId;
  }

  async sendRequest(myId: string, otherId: string) {
    if (myId === otherId) throw new BadRequestException('You cannot friend yourself');

    const other = await this.prisma.user.findUnique({
      where: { id: otherId },
      select: { id: true },
    });
    if (!other) throw new BadRequestException('Cannot find user');

    const { userAId, userBId } = this.pair(myId, otherId);

    const existing = await this.prisma.friendship.findUnique({
      where: { userAId_userBId: { userAId, userBId } },
      select: { id: true, status: true, requesterId: true, blockerId: true, userAId: true, userBId: true },
    });

    if (existing) {
      if (existing.status === FriendStatus.BLOCKED) {
        throw new ForbiddenException('Cannot send request');
      }
      if (existing.status === FriendStatus.ACCEPTED) {
        throw new BadRequestException('Already friends');
      }

      // If there is a pending request, allow "cross-request" to auto-accept
      if (existing.status === FriendStatus.PENDING) {
        // If I am not the requester, I can accept directly (auto-accept UX)
        if (existing.requesterId && existing.requesterId !== myId) {
          return this.accept(myId, existing.id);
        }
        // If I am the requester, the request already exists
        throw new BadRequestException('Friend request already exists');
      }

      // REJECTED: you can choose to overwrite with a new PENDING request
      return this.prisma.friendship.update({
        where: { id: existing.id },
        data: { status: FriendStatus.PENDING, requesterId: myId, blockerId: null },
        select: this.selectRow(myId),
      });
    }

    // Create fresh request row
    return this.prisma.friendship.create({
      data: {
        userAId,
        userBId,
        status: FriendStatus.PENDING,
        requesterId: myId,
        blockerId: null,
      },
      select: this.selectRow(myId),
    });
  }

  async accept(myId: string, friendshipId: string) {
    const row = await this.prisma.friendship.findUnique({
      where: { id: friendshipId },
      select: { id: true, status: true, requesterId: true, blockerId: true, userAId: true, userBId: true },
    });
    if (!row) throw new NotFoundException('Friend request not found');
    if (!this.isParticipant(myId, row)) throw new ForbiddenException('Not allowed');

    if (row.status === FriendStatus.BLOCKED) throw new ForbiddenException('Blocked');
    if (row.status !== FriendStatus.PENDING) throw new BadRequestException('Request is not pending');
    if (!row.requesterId) throw new BadRequestException('Malformed request');

    // Only the non-requester may accept
    if (row.requesterId === myId) throw new ForbiddenException('Requester cannot accept');

    return this.prisma.friendship.update({
      where: { id: row.id },
      data: { status: FriendStatus.ACCEPTED, blockerId: null },
      select: this.selectRow(myId),
    });
  }

  async reject(myId: string, friendshipId: string) {
    const row = await this.prisma.friendship.findUnique({
      where: { id: friendshipId },
      select: { id: true, status: true, requesterId: true, blockerId: true, userAId: true, userBId: true },
    });
    if (!row) throw new NotFoundException('Friend request not found');
    if (!this.isParticipant(myId, row)) throw new ForbiddenException('Not allowed');

    if (row.status === FriendStatus.BLOCKED) throw new ForbiddenException('Blocked');
    if (row.status !== FriendStatus.PENDING) throw new BadRequestException('Request is not pending');
    if (!row.requesterId) throw new BadRequestException('Malformed request');

    // Only the non-requester may reject
    if (row.requesterId === myId) throw new ForbiddenException('Requester cannot reject');

    return this.prisma.friendship.update({
      where: { id: row.id },
      data: { status: FriendStatus.REJECTED, blockerId: null },
      select: this.selectRow(myId),
    });
  }

  async cancel(myId: string, otherId: string) {
    if (myId === otherId) throw new BadRequestException('Invalid user');

    const { userAId, userBId } = this.pair(myId, otherId);

    const row = await this.prisma.friendship.findUnique({
      where: { userAId_userBId: { userAId, userBId } },
      select: { id: true, status: true, requesterId: true, blockerId: true },
    });

    if (!row) {
      throw new NotFoundException('Friendship not found');
    }

    // If PENDING: only requester can cancel
    if (row.status === FriendStatus.PENDING) {
      if (row.requesterId !== myId) throw new ForbiddenException('Only requester can cancel pending request');
      await this.prisma.friendship.delete({ where: { id: row.id } });
      return { ok: true };
    }

    // If ACCEPTED: either party can remove the friend
    if (row.status === FriendStatus.ACCEPTED) {
      await this.prisma.friendship.delete({ where: { id: row.id } });
      // Delete all messages between these two users
      await this.chatService.deleteMessagesBetween(myId, otherId);
      return { ok: true };
    }

    throw new BadRequestException(`Cannot cancel friendship with status: ${row.status}`);
  }

  async block(myId: string, otherId: string) {
    if (myId === otherId) throw new BadRequestException('You cannot block yourself');

    const other = await this.prisma.user.findUnique({
      where: { id: otherId },
      select: { id: true },
    });
    if (!other) throw new BadRequestException('Cannot find user');

    const { userAId, userBId } = this.pair(myId, otherId);

    // Delete all messages between these two users before blocking
    await this.chatService.deleteMessagesBetween(myId, otherId);

    return this.prisma.friendship.upsert({
      where: { userAId_userBId: { userAId, userBId } },
      update: { status: FriendStatus.BLOCKED, blockerId: myId, requesterId: null },
      create: { userAId, userBId, status: FriendStatus.BLOCKED, blockerId: myId, requesterId: null },
      select: this.selectRow(myId),
    });
  }

  async unblock(myId: string, otherId: string) {
    if (myId === otherId) throw new BadRequestException('You cannot unblock yourself');

    const { userAId, userBId } = this.pair(myId, otherId);

    const row = await this.prisma.friendship.findUnique({
      where: { userAId_userBId: { userAId, userBId } },
      select: { id: true, status: true, blockerId: true, userAId: true, userBId: true },
    });

    if (!row || row.status !== FriendStatus.BLOCKED) {
      // Idempotent unblock
      return { ok: true };
    }

    // Only the blocker can unblock (recommended)
    if (row.blockerId !== myId) throw new ForbiddenException('Only blocker can unblock');

    // Recommended post-unblock behavior: remove relationship row entirely
    await this.prisma.friendship.delete({ where: { id: row.id } });
    return { ok: true };
  }

  async getFriendUserIds(userId: string): Promise<string[]> {
    const friendships = await this.prisma.friendship.findMany({
      where: {
        status: FriendStatus.ACCEPTED,
        OR: [{ userAId: userId }, { userBId: userId }],
      },
      select: { userAId: true, userBId: true },
    });
    return friendships.map((f) => (f.userAId === userId ? f.userBId : f.userAId));
  }

  async getLobbyIdForUser(userId: string) {
    return this.lobbyService.getLobbyIdForUser(userId);
  }

  async friendsList(myId: string) {
    const rows = await this.prisma.friendship.findMany({
        where: {
            status: FriendStatus.ACCEPTED,
            OR: [{ userAId: myId }, { userBId: myId }],
        },
        select: this.selectRow(myId),
        orderBy: { updatedAt: 'desc' },
    });

    return Promise.all(
      rows.map(async (r) => {
        const friend = (r.userA.id === myId ? r.userB : r.userA) as any;
        const online = await this.redisService.isUserOnline(friend.id);
        const lobbyId = await this.lobbyService.getLobbyIdForUser(friend.id);

        let status = online ? 'online' : 'offline';
        if (online && lobbyId) status = 'in-game';

        return {
          id: r.id,
          status: r.status,
          since: r.createdAt,
          updatedAt: r.updatedAt,
          friend: {
            ...friend,
            status,
          },
        };
      }),
    );
  }

  async pendingRequests(myId: string) {
    const rows = await this.prisma.friendship.findMany({
      where: {
        status: FriendStatus.PENDING,
        OR: [{ userAId: myId }, { userBId: myId }],
      },
      select: this.selectRow(myId),
      orderBy: { updatedAt: 'desc' },
    });

    return Promise.all(
      rows.map(async (r) => {
        const isRequester = r.requesterId === myId;
        const friend = (r.userA.id === myId ? r.userB : r.userA) as any;
        const online = await this.redisService.isUserOnline(friend.id);
        const lobbyId = await this.lobbyService.getLobbyIdForUser(friend.id);

        let status = online ? 'online' : 'offline';
        if (online && lobbyId) status = 'in-game';

        return {
          id: r.id,
          status: r.status,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
          requesterId: r.requesterId,
          isRequester,
          friend: {
            ...friend,
            status,
          },
        };
      }),
    );
  }

  async blockedUsers(myId: string) {
    const rows = await this.prisma.friendship.findMany({
      where: {
        status: FriendStatus.BLOCKED,
        OR: [{ userAId: myId }, { userBId: myId }],
      },
      select: this.selectRow(myId),
      orderBy: { updatedAt: 'desc' },
    });

    return Promise.all(
      rows.map(async (r) => {
        const friend = (r.userA.id === myId ? r.userB : r.userA) as any;
        const online = await this.redisService.isUserOnline(friend.id);
        const lobbyId = await this.lobbyService.getLobbyIdForUser(friend.id);

        let status = online ? 'online' : 'offline';
        if (online && lobbyId) status = 'in-game';

        return {
          id: r.id,
          status: r.status,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
          blockerId: r.blockerId,
          isBlocker: r.blockerId === myId,
          friend: {
            ...friend,
            status,
          },
        };
      }),
    );
  }

  // Select includes "me vs other" convenience
  private selectRow(myId: string) {
    return {
      id: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      requesterId: true,
      blockerId: true,
      userA: { select: { id: true, username: true, avatarPath: true } },
      userB: { select: { id: true, username: true, avatarPath: true } },
    };
  }
}
