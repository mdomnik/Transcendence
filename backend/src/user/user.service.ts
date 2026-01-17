import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { join } from 'path';
import { promises as fs } from 'fs';
import { UpdateMeDto } from "./dto/update-me.dto";

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
          { id: { not: requesterId } }, 
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

  async setAvatarFromUpload(userId: string, file: Express.Multer.File) {
    // Choose a stable filename per user to simplify replacements
    // Keep extension consistent with the uploaded file.
    const ext = file.filename.split('.').pop()?.toLowerCase();
    if (!ext) throw new BadRequestException('Could not determine file extension');

    const avatarsDir = join(process.cwd(), 'uploads', 'avatars');
    const finalName = `${userId}.${ext}`;
    const finalPath = join(avatarsDir, finalName);

    // Ensure directory exists
    await fs.mkdir(avatarsDir, { recursive: true });

    // Remove old avatar files with other extensions (optional but nice)
    // e.g. user previously uploaded .png, now .webp
    const possibleExts = ['png', 'jpg', 'jpeg', 'webp'];
    await Promise.all(
      possibleExts
        .filter((e) => e !== ext)
        .map(async (e) => {
          const p = join(avatarsDir, `${userId}.${e}`);
          try {
            await fs.unlink(p);
          } catch {
            // ignore if not present
          }
        }),
    );

    // Move uploaded temp file to stable final path
    await fs.rename(file.path, finalPath);

    const avatarPath = `/uploads/avatars/${finalName}`;

    // Update user
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarPath },
      select: { id: true, email: true, username: true, avatarPath: true },
    });

    return updated;
  }

  async removeAvatar(userId: string) {
    const avatarsDir = join(process.cwd(), 'uploads', 'avatars');
    const possibleExts = ['png', 'jpg', 'jpeg', 'webp'];

    await Promise.all(
      possibleExts.map(async (e) => {
        try {
          await fs.unlink(join(avatarsDir, `${userId}.${e}`));
        } catch {}
      }),
    );

    return this.prisma.user.update({
      where: { id: userId },
      data: { avatarPath: null },
      select: { id: true, email: true, username: true, avatarPath: true },
    });
  }

  async updateMe(userId: string, dto: UpdateMeDto) {
    const existingUser = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, username: true },
    });
    if(!existingUser) throw new NotFoundException('user not found');

    const data: any = {};
    if (dto.username !== undefined) {
      const next = dto.username.trim();

      if (next.length === 0) {
        throw new BadRequestException('Username cannot be empty');
      }

      // If changed, enforce uniqueness
      if (next !== existingUser.username) {
        const taken = await this.prisma.user.findUnique({
          where: { username: next },
          select: { id: true },
        });
        if (taken) throw new BadRequestException('Username already taken');
      }
    data.username = next;
  }
  if (Object.keys(data).length === 0) {
      // No updates requested; return current state (or 400)
      return this.getMe(userId);
    }

  await this.prisma.user.update({
      where: { id: userId },
      data,
  });
  return this.getMe(userId);
  }
}