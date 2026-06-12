import { IsEmail, IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

// Mirrors the rules that previously lived in user.entity.ts's static validators.
const PASSWORD_HAS_NUMBER = /\d/;
const PASSWORD_HAS_SPECIAL = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;

export class CreateUserDto {
    @IsEmail()
    @IsNotEmpty()
    email!: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    @Matches(PASSWORD_HAS_NUMBER, { message: 'Password must contain at least one number' })
    @Matches(PASSWORD_HAS_SPECIAL, { message: 'Password must contain at least one special character' })
    password!: string;

    @IsString()
    @IsNotEmpty()
    firstName!: string;

    @IsString()
    @IsNotEmpty()
    lastName!: string;
}
