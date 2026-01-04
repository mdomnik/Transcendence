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

    async signin(dto: AuthDto) {
        // find user
        const user = await this.prisma.user.findUnique({
            where: {
                email: dto.email,
            },
        });
        //if user doesnt exist throw exception
        if(!user)
            throw new ForbiddenException(
                'Credentials incorrect',
        );
        //compare password
        const pwMatches = await argon.verify(
            user.password,
            dto.password,
        );
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
}
