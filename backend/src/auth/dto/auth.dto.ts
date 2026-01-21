import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

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

    @IsOptional()
    @IsBoolean()
    remember?: boolean;
}

export class SignInDto {
    @IsString()
    @IsNotEmpty()
    identifier: string; // Can be either email or username

    @IsString()
    @IsNotEmpty()
    password: string;

    @IsOptional()
    @IsBoolean()
    remember?: boolean;
}