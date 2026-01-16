import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class LeaderboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getLeaderboard(limit) {
    return this.prisma.userStats.findMany({
      take: limit as number,
      include: {
        user: {
          select: { username: true },
        },
      },
    });
  }
}
