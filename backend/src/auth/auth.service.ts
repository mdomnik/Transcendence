import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthDto } from './dto';

@Injectable()
export class AuthService {
    constructor(private prisma: PrismaService) {}

    async signup(dto: AuthDto) {
        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                password: dto.password
            }
        })
        console.log('user created');
        return user;
    }

    signin() {
        return {msg: 'I have signed in'};
    }
}
