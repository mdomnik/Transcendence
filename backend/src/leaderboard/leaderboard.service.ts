/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LeaderboardEntryDto } from './dto/leaderboard-entry.dto';
import { LeaderboardGateway } from './leaderboard.gateway';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class LeaderboardService {
  constructor(private prisma: PrismaService) {}

  async getTop(limit = 20): Promise<LeaderboardEntryDto[]> {
    const stats = await this.prisma.userStats.findMany({
      take: limit,
      orderBy: [
        { gamesWon: 'desc' },
        { correctAnswers: 'desc' },
        { gamesPlayed: 'desc' },
      ],
      include: {
        user: {
          select: {
            username: true,
          },
        },
      },
    });

    return stats.map((s) => ({
      userId: s.userId,
      username: s.user.username,
      gamesPlayed: s.gamesPlayed,
      gamesWon: s.gamesWon,
      gamesLost: s.gamesLost,
      winRate:
        s.gamesPlayed === 0
          ? 0
          : Math.round((s.gamesWon / s.gamesPlayed) * 100),
      accuracy:
        s.totalQuestions === 0
          ? 0
          : Math.round((s.correctAnswers / s.totalQuestions) * 100),
    }));
  }
}
