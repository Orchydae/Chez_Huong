import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';

interface JwtPayload {
    sub: string;
    email: string;
    role: Role;
    firstName?: string;
}

/**
 * Verifies the Bearer token on every protected request. The returned object
 * is attached to `req.user`. Field names match `Express.User`
 * (see src/types/express.d.ts).
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET')!,
        });
    }

    validate(payload: JwtPayload): Express.User {
        return {
            userId: payload.sub,
            email: payload.email,
            role: payload.role,
            firstName: payload.firstName,
        };
    }
}
