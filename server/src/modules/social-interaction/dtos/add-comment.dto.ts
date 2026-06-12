import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AddCommentDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(1000)
    // IsNotEmpty alone accepts "   " — trim first so a whitespace-only comment
    // 400s instead of being stored as a blank card
    @Transform(({ value }): unknown => (typeof value === 'string' ? value.trim() : value))
    content!: string;
}
