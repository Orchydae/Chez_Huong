import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';

/**
 * Validates email + password against the DB on POST /auth/login.
 * On success the returned object is attached to `req.user` and lands in
 * AuthController.login. Field names match `Express.User` (see src/types/express.d.ts).
 */
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
    constructor(private authService: AuthService) {
        super({ usernameField: 'email' });
    }

    async validate(email: string, pass: string): Promise<Express.User> {
        const user = await this.authService.validateUser(email, pass);
        if (!user) {
            throw new UnauthorizedException();
        }
        return user;
    }
}
