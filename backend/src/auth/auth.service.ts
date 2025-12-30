import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthDto } from './dto';

@Injectable()
export class AuthService {
    constructor(private prisma: PrismaService) {}
    signup(dto: AuthDto) {
        console.log(dto);
    }

    signin() {
        return {msg: 'I have signed in'};
    }
}
