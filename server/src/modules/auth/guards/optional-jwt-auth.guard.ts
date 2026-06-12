import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Like {@link JwtAuthGuard}, but never rejects the request.
 *
 * A valid Bearer token populates `req.user`; a missing, expired, or invalid
 * token simply leaves `req.user` undefined instead of throwing 401. This lets a
 * single read endpoint serve both anonymous readers (who may see only published
 * recipes) and authenticated authors (who may also read their own drafts).
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
    handleRequest<TUser = Express.User>(_err: unknown, user: TUser | false): TUser {
        // Swallow auth errors and missing users: return the user when present,
        // otherwise undefined (leaving req.user unset) rather than throwing 401.
        return (user || undefined) as TUser;
    }
}
