import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async saveMessage(senderId: string, receiverId: string, content: string) {
    return this.prisma.chatMessage.create({
      data: {
        senderId,
        receiverId,
        content,
      },
      include: {
        sender: { select: { id: true, username: true, avatarPath: true } },
      },
    });
  }

  async getMessages(userId: string, friendId: string) {
    return this.prisma.chatMessage.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: friendId },
          { senderId: friendId, receiverId: userId },
        ],
      },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: { select: { id: true, username: true, avatarPath: true } },
      },
      take: 50, // Limit to last 50 messages for now
    });
  }

  async markAsRead(receiverId: string, senderId: string) {
    return this.prisma.chatMessage.updateMany({
      where: {
        senderId,
        receiverId,
        read: false,
      },
      data: { read: true },
    });
  }

  async getUnreadCounts(userId: string) {
    const counts = await this.prisma.chatMessage.groupBy({
      by: ['senderId'],
      where: {
        receiverId: userId,
        read: false,
      },
      _count: {
        id: true,
      },
    });

    return counts.map((c) => ({
      senderId: c.senderId,
      count: c._count.id,
    }));
  }

  async deleteMessagesBetween(userId1: string, userId2: string) {
    return this.prisma.chatMessage.deleteMany({
      where: {
        OR: [
          { senderId: userId1, receiverId: userId2 },
          { senderId: userId2, receiverId: userId1 },
        ],
      },
    });
  }
}
