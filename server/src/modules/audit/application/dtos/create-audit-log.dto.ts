import { IsString, IsOptional, IsJSON, IsNotEmpty } from 'class-validator';

export class CreateAuditLogDto {
    @IsString()
    @IsOptional()
    userId?: string;

    @IsString()
    @IsOptional()
    userEmail?: string;

    @IsString()
    @IsNotEmpty()
    action!: string;

    @IsString()
    @IsNotEmpty()
    resourceType!: string;

    @IsString()
    @IsOptional()
    resourceId?: string;

    @IsOptional()
    metadata?: any;

    @IsString()
    @IsOptional()
    ipAddress?: string;

    @IsString()
    @IsOptional()
    userAgent?: string;
}
