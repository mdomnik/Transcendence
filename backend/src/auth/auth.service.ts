import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthDto } from './dto';
import * as argon from 'argon2';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from 'src/user/user.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private userservice: UserService,
  ) {}

  async signup(dto: AuthDto) {
    //generate
    const hash = await argon.hash(dto.password);
    const normalizedUsername = dto.username.trim().toLowerCase();
    const normalizedEmail = dto.email.trim().toLowerCase();
    try {
      const user = await this.prisma.user.create({
        data: {
          username: normalizedUsername,
          email: normalizedEmail,
          password: hash,
        },
      });
      await this.userservice.ensureUserStats(user.id);
      return this.signToken(user.username, user.id, user.email, dto.remember);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError)
        if (error.code === 'P2002')
          throw new ForbiddenException('Credentials taken');
      throw error;
    }
  }

  async signin(dto: { identifier: string; password: string; remember?: boolean }) {
    const normalizedIdentifier = dto.identifier.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: normalizedIdentifier }, { username: normalizedIdentifier }],
      },
    });
    if (!user) throw new ForbiddenException('Credentials incorrect');
    const pwMatches = user.password
      ? await argon.verify(user.password, dto.password)
      : null;
    if (!pwMatches) throw new ForbiddenException('Credentials incorrect');

    return this.signToken(user.username, user.id, user.email, dto.remember);
  }

  async signToken(
    username: string,
    userID: string,
    email: string,
    remember: boolean = false,
  ): Promise<string> {
    const payload = {
      sub: userID,
      email,
    };
    const secret = process.env.JWT_SECRET;
    const expiresIn = remember ? '7d' : '24h';

    return await this.jwt.signAsync(payload, {
      expiresIn: expiresIn,
      secret: secret,
    });
  }

  async validateUser(email: string, googleId: string) {
    console.log('Google Auth Service');
    console.log(email, googleId);
    const normalizedEmail = email.trim().toLowerCase();
    let user = await this.prisma.user.findFirst({
      where: { OR: [{ googleId }, { email: normalizedEmail }] },
    });

    if (!user) {
      const baseUsername = normalizedEmail.split('@')[0];
      const username = await this.generateUniqueUsername(baseUsername);

      user = await this.prisma.user.create({
        data: { email: normalizedEmail, googleId, username },
      });
      await this.userservice.ensureUserStats(user.id);
      return user;
    }
    return user;
  }

  private async generateUniqueUsername(base: string) {
    let username = base;
    let i = 1;

    while (await this.prisma.user.findUnique({ where: { username } })) {
      username = `${base}${i++}`;
    }
    return username;
  }
}
