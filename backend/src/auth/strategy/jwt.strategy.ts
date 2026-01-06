import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "src/prisma/prisma.service";
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(config: ConfigService, private prisma: PrismaService) {
        super({
        jwtFromRequest: ExtractJwt.fromExtractors([
            (request: Request) => {
                return request?.cookies?.access_token;
            },
        ]),
        ignoreExpiration: false,
        secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
    }

    async validate(payload: {sub: string, email: string}) {
        const user = await this.prisma.user.findUnique({
          where: { id: payload.sub },
          select: { id: true, email: true, username: true }, // omit password
        });
        // if (!user) throw new UnauthorizedException();
        return user;
  }
}
