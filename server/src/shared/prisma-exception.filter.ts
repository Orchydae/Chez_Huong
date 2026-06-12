import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

/**
 * Translates Prisma's known request errors into clean HTTP responses, in one
 * place, so services can let them propagate instead of each wrapping every
 * write in a try/catch. Messages are deliberately generic — they never leak
 * table or column names.
 *
 * Unmapped Prisma codes are logged and surfaced as a 500 (not masked as a 4xx),
 * so genuinely unexpected database errors still read as bugs.
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(PrismaExceptionFilter.name);

    catch(err: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost): void {
        const res = host.switchToHttp().getResponse<Response>();

        switch (err.code) {
            case 'P2002': // unique constraint violation
                return this.send(res, 409, 'Conflict', 'A record with these values already exists');
            case 'P2003': // foreign-key constraint violation
                return this.send(res, 400, 'Bad Request', 'A referenced record does not exist');
            case 'P2025': // required record not found (update/delete target missing)
                return this.send(res, 404, 'Not Found', 'The requested record was not found');
            default:
                this.logger.error(`Unmapped Prisma error ${err.code}: ${err.message}`);
                return this.send(res, 500, 'Internal Server Error', 'Internal server error');
        }
    }

    private send(res: Response, statusCode: number, error: string, message: string): void {
        res.status(statusCode).json({ statusCode, error, message });
    }
}
