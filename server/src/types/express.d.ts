import type { Role } from '@prisma/client';

/**
 * Shape of `req.user` after either Passport strategy authenticates. Both
 * LocalStrategy.validate and JwtStrategy.validate return this exact shape,
 * so consumers (guards, controllers) read the same fields regardless of
 * which guard let the request through.
 *
 * `Express.Request.user` is contributed by @types/passport; this file only
 * fills in the `User` interface that augmentation hangs off of.
 */
declare global {
    namespace Express {
        interface User {
            userId: string;
            email: string;
            role: Role;
            firstName?: string;
            lastName?: string;
        }
    }
}

export { };
