import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AddCommentDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(1000)
    content!: string;
}
