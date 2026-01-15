import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";


@Injectable()
export class UserService {
    constructor(private prisma: PrismaService) {}
async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
        updatedAt: true,
        stats: {
          select: {
            gamesPlayed: true,
            gamesWon: true,
            gamesLost: true,
            totalQuestions: true,
            correctAnswers: true,
            updatedAt: true,
          },
        },
        _count: {
          select: {
            games: true,
            requestsSent: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    const gamesPlayed = user.stats?.gamesPlayed ?? 0;
    const gamesWon = user.stats?.gamesWon ?? 0;
    const totalQuestions = user.stats?.totalQuestions ?? 0;
    const correctAnswers = user.stats?.correctAnswers ?? 0;

    return {
      ...user,
      derived: {
        winRate: gamesPlayed > 0 ? gamesWon / gamesPlayed : 0,
        accuracy: totalQuestions > 0 ? correctAnswers / totalQuestions : 0,
      },
    };
  }

  async getPublicProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        createdAt: true,
        stats: {
          select: {
            gamesPlayed: true,
            gamesWon: true,
            gamesLost: true,
            totalQuestions: true,
            correctAnswers: true,
          },
        },
        _count: {
          select: {
            games: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    const gamesPlayed = user.stats?.gamesPlayed ?? 0;
    const gamesWon = user.stats?.gamesWon ?? 0;
    const totalQuestions = user.stats?.totalQuestions ?? 0;
    const correctAnswers = user.stats?.correctAnswers ?? 0;

    return {
      ...user,
      derived: {
        winRate: gamesPlayed > 0 ? gamesWon / gamesPlayed : 0,
        accuracy: totalQuestions > 0 ? correctAnswers / totalQuestions : 0,
      },
    };
  }

  async ensureUserStats(userId: string) {
    // Call this on signup / google login to guarantee stats exist
    return this.prisma.userStats.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }

  async searchUsers(query: string, requesterId: string) {
    console.log("query: ", query);
    const q = (query ?? '').trim();

    if (q.length < 2) {
      throw new BadRequestException('Query must be at least 2 characters');
    }

    const users = await this.prisma.user.findMany({
      where: {
        AND: [
          { id: { not: requesterId } }, // don't show yourself
          {
            OR: [
              { username: { contains: q, mode: 'insensitive' } },
            ],
          },
        ],
      },
      select: {
        id: true,
        username: true,
        createdAt: true,
        stats: {
          select: {
            gamesPlayed: true,
            gamesWon: true,
            gamesLost: true,
          },
        },
      },
      take: 20,
      orderBy: { username: 'asc' },
    });

    return users;
  }

  async updateProfile(userId: string, data: { username?: string; avatarUrl?: string }) {
    if (data.username) {
      const existing = await this.prisma.user.findFirst({
        where: {
          username: { equals: data.username, mode: 'insensitive' },
          id: { not: userId },
        },
      });

      if (existing) {
        throw new BadRequestException('Username is already taken');
      }
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        username: data.username,
        avatarUrl: data.avatarUrl,
      },
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
      },
    });
  }
}
