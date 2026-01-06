import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthDto } from './dto';
import * as argon from 'argon2';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
    constructor(private prisma: PrismaService, private jwt: JwtService) {}

    async signup(dto: AuthDto) {
    //generate
        const hash = await argon.hash(dto.password);
        try {
            const user = await  this.prisma.user.create({
                data: {
                    username: dto.username,
                    email: dto.email,
                    password: hash,
                },
    
                
            });
    
            return this.signToken(user.username, user.id, user.email);
            
        } catch (error) {
            if (error instanceof PrismaClientKnownRequestError)
                if (error.code === 'P2002')
                    throw new ForbiddenException('Credentials taken');
            throw error;
        }
    }

    async signin(dto: { identifier: string; password: string }) {
        // find user by email or username
        const user = await this.prisma.user.findFirst({
            where: {
                OR: [
                    { email: dto.identifier },
                    { username: dto.identifier },
                ],
            },
        });
        //if user doesnt exist throw exception
        if(!user)
            throw new ForbiddenException(
                'Credentials incorrect',
        );
        //compare password
        const pwMatches = user.password ? await argon.verify(
            user.password,
            dto.password,
        ) : null;
        //if password incorrect throw exception
        if(!pwMatches)
            throw new ForbiddenException(
                'Credentials incorrect',
        );
        // send back the user

        return this.signToken(user.username, user.id, user.email);
    }

    async signToken(
        username: string,
        userID: string,
        email: string, 
    ): Promise<{ access_token: string }> {
        const payload = {
            sub: userID,
            email
        }
        const secret = process.env.JWT_SECRET 

        const token = await this.jwt.signAsync(
            payload, 
            {
            expiresIn: '24h',
            secret: secret,
        });

        return {
            access_token: token,
        };
    }

    async validateUser(email: string, googleId: string) {
        console.log('Google Auth Service');
        console.log(email, googleId);
        let user = await this.prisma.user.findFirst({
          where: { OR: [{ googleId }, { email }] },
        });

        if (!user) {
          const baseUsername = email.split('@')[0];
          const username = await this.generateUniqueUsername(baseUsername);
      
        user = await this.prisma.user.create({
            data: { email, googleId, username },
        });
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
