import { BadRequestException } from '@nestjs/common';
import { ValidationError } from 'class-validator';

/**
 * Flatten class-validator's (possibly nested) errors into dotted property paths
 * — e.g. `ingredientSections.0.ingredients.2.unit`. The client uses these paths
 * to point the author at the exact row/field that failed; it implements no
 * validation rules of its own (the server stays the single source of truth).
 */
function flatten(errors: ValidationError[], parent = ''): { path: string; messages: string[] }[] {
    const out: { path: string; messages: string[] }[] = [];
    for (const err of errors) {
        const path = parent ? `${parent}.${err.property}` : err.property;
        if (err.constraints) out.push({ path, messages: Object.values(err.constraints) });
        if (err.children && err.children.length > 0) out.push(...flatten(err.children, path));
    }
    return out;
}

/**
 * Custom ValidationPipe exceptionFactory: same 400 shape as before plus a
 * `fields` array of the offending dotted paths. Reused shape so service-level
 * checks (RecipesService) can return the same `{ message, fields }` envelope.
 */
export function validationExceptionFactory(errors: ValidationError[]): BadRequestException {
    const flat = flatten(errors);
    return new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: flat.flatMap(f => f.messages),
        fields: flat.map(f => f.path),
    });
}

/** Build the same `{ message, fields }` 400 envelope from explicit row paths. */
export function fieldValidationException(
    errors: { path: string; message: string }[],
): BadRequestException {
    return new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: errors.map(e => e.message),
        fields: errors.map(e => e.path),
    });
}
