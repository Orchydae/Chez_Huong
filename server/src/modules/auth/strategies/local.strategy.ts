/// Implement Local Strategy: This handles the initial "Login" action 
// (verifying email/password with Argon2).
import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
    constructor(private authService: AuthService) {
        super({
            // By default, passport-local looks for a field named 'username' in the body.
            // Since our app uses 'email', we need to tell Passport to look for that instead.
            usernameField: 'email',
            // We don't need to specify 'passwordField' because it defaults to 'password', which matches our request body.
        });
    }

    // This validate method is called automatically by Passport when the strategy is used.
    // Passport extracts the username (email) and password from the request body based on the configuration above
    // and passes them as arguments to this function.
    async validate(email: string, pass: string): Promise<any> {
        const user = await this.authService.validateUser(email, pass);
        if (!user) {
            // If the user is not found or password doesn't match, we throw an UnauthorizedException.
            throw new UnauthorizedException();
        }
        // If validation succeeds, this user object is attached to the request object (req.user).
        return user;
    }
}
