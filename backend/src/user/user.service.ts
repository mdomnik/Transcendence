import { Injectable, NotFoundException } from "@nestjs/common";
import { use } from "passport";
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
            friendshipsSent: true,
            friendshipsReceived: true,
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

  async getIdFromUsername(username: string) {
    return this.prisma.user.findUnique({
      where: { username: username},
      select: { id: true },
    });
  }
}