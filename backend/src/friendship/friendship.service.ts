// import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
// import { FriendStatus } from 'generated/prisma/enums';
// import { PrismaService } from 'src/prisma/prisma.service';


// @Injectable()
// export class FriendshipService {
//     constructor(private prisma: PrismaService) {}

//     async sendRequest(myId: string, otherId: string) {
//         if(myId === otherId) throw new BadRequestException('You cannot friend yourself');

//         const findOther = await this.prisma.user.findUnique({ where: {id: otherId }, select: { id: true } });
//         if(!findOther) throw new BadRequestException('Cannot find user');

//         const accepted = await this.prisma.friendship.findFirst({
//             where: {
//                 status: FriendStatus.ACCEPTED,
//                 OR: [
//                     { userId: myId, friendId: otherId },
//                     { userId: otherId, friendId: myId },
//                 ],
//             },
//             select: { id: true },
//         });
//         if (accepted) throw new BadRequestException('Already friends');

//         const blocked = await this.prisma.friendship.findFirst({
//           where: {
//             status: FriendStatus.BLOCKED,
//             OR: [
//               { userId: myId, friendId: otherId },
//               { userId: otherId, friendId: myId },
//             ],
//           },
//           select: { id: true },
//         });
//         if (blocked) throw new ForbiddenException('Cannot send request');

//         const incoming = await this.prisma.friendship.findFirst({
//             where: { userId: otherId, friendId: myId, status: FriendStatus.PENDING },
//             select: { id: true },
//         });
//         if(incoming) {
//             return this.accept(myId, incoming.id);
//         }

//        try {
//         return await this.prisma.friendship.create({
//             data: { userId: myId, friendId: otherId, status: FriendStatus.PENDING },
//             select: this.selectRow(),
//         });
//        } catch {
//         throw new BadRequestException('Request friendship already exists');
//        } 
//     }

//     async accept(myId: string, friendshipId: string) {
//         const req = await this.prisma.friendship.findUnique({
//             where: { id: friendshipId },
//             select: { id: true, userId: true, friendId: true, status: true },
//         });
//         if(!req) throw new NotFoundException('Friend request not found');

//         if(req.friendId !== myId) throw new ForbiddenException('Not allowed');
//         if(req.status !== FriendStatus.PENDING) throw new BadRequestException('Request is not pending');

//         const requesterId = req.userId;
//         const addresseeId = req.friendId; 

//         const [updated] = await this.prisma.$transaction([
//           // Update the original request row
//           this.prisma.friendship.update({
//             where: { id: req.id },
//             data: { status: FriendStatus.ACCEPTED },
//             select: this.selectRow(),
//           }),

//           // Ensure reverse direction exists and is ACCEPTED
//           this.prisma.friendship.upsert({
//             where: {
//               userId_friendId: { userId: addresseeId, friendId: requesterId },
//             },
//             update: { status: FriendStatus.ACCEPTED },
//             create: { userId: addresseeId, friendId: requesterId, status: FriendStatus.ACCEPTED },
//             select: { id: true },
//           }),
//         ]);
//         return updated;
//     }

//     private selectRow() {
//         return {
//           id: true,
//           status: true,
//           createdAt: true,
//           updatedAt: true,
//           requester: { select: { id: true, username: true } },
//           addressee: { select: { id: true, username: true } },
//         };
//     }
// }

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { FriendStatus } from 'generated/prisma/enums';

@Injectable()
export class FriendshipService {
  constructor(private readonly prisma: PrismaService) {}

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

    if (!row || row.status !== FriendStatus.PENDING) {
      throw new NotFoundException('Pending request not found');
    }
    if (row.requesterId !== myId) throw new ForbiddenException('Only requester can cancel');

    await this.prisma.friendship.delete({ where: { id: row.id } });
    return { ok: true };
  }

  async block(myId: string, otherId: string) {
    if (myId === otherId) throw new BadRequestException('You cannot block yourself');

    const other = await this.prisma.user.findUnique({
      where: { id: otherId },
      select: { id: true },
    });
    if (!other) throw new BadRequestException('Cannot find user');

    const { userAId, userBId } = this.pair(myId, otherId);

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

  async friendsList(myId: string) {
    const rows = await this.prisma.friendship.findMany({
    where: {
      status: FriendStatus.ACCEPTED,
      OR: [{ userAId: myId }, { userBId: myId }],
    },
    select: {
      id: true,
      updatedAt: true,
      userA: { select: { id: true, username: true } },
      userB: { select: { id: true, username: true } },
    },
    orderBy: { updatedAt: 'desc' },
   });
    return rows.map((r) => {
        const other = r.userA.id === myId? r.userB : r.userA;
        return {
            friendshipId: r.id,
            since: r.updatedAt,
            friend: other,
        };
    });
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
      userA: { select: { id: true, username: true } },
      userB: { select: { id: true, username: true } },
    };
  }
}
