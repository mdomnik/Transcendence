import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class AuthDto {

    @IsString()
    @IsNotEmpty()
    username: string;

    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    password: string;
}

export class SignInDto {
    @IsString()
    @IsNotEmpty()
    identifier: string; // Can be either email or username

    @IsString()
    @IsNotEmpty()
    password: string;
}