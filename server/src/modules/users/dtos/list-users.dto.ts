import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Query parameters for the admin user directory (`GET /users`). Mirrors the
 * Discovery DTO style so a malformed `take`/`skip` (e.g. `?take=abc`) is a
 * clean 400 from the ValidationPipe rather than a NaN that reaches Prisma and
 * surfaces as a 500. `take` is capped so one request can't pull the whole table.
 */
export class ListUsersDto {
    /** Matches name OR email, case-insensitive contains. */
    @IsOptional()
    @IsString()
    @MaxLength(100)
    q?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    take?: number = 20;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    skip?: number = 0;
}
