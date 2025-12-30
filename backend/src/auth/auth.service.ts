import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthDto } from './dto';
import * as argon from 'argon2';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';

@Injectable()
export class AuthService {
    constructor(private prisma: PrismaService) {}
    async signup(dto: AuthDto) {
    //generate
        const hash = await argon.hash(dto.password);
        try {
            const user = await  this.prisma.user.create({
                data: {
                    email: dto.email,
                    password: hash,
                },
    
                
            });
    
            return user;
            
        } catch (error) {
            if (error instanceof PrismaClientKnownRequestError)
                if (error.code === 'P2002')
                    throw new ForbiddenException('Credentials taken');
            throw error;
        }
    }

    signin() {
        return {msg: 'I have signed in'};
    }
}
