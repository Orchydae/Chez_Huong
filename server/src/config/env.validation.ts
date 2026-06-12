import * as Joi from 'joi';

/**
 * Validates `process.env` at boot. ConfigModule throws (and the server fails
 * to start) when required vars are missing — much safer than discovering it
 * on the first request to a code path that needs the secret.
 */
export const envValidationSchema = Joi.object({
    NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
    PORT: Joi.number().port().default(3000),

    JWT_SECRET: Joi.string().min(32).required(),

    DATABASE_URL: Joi.string().uri().required(),
    DIRECT_URL: Joi.string().uri().required(),

    USDA_API_KEY: Joi.string().required(),
    GOOGLE_CLOUD_TRANSLATION_API_KEY: Joi.string().required(),

    SUPABASE_URL: Joi.string().uri().required(),
    SUPABASE_SERVICE_ROLE_KEY: Joi.string().required(),
    // Empty string allowed — main.ts falls back to "Chez Huong Medias" when absent.
    SUPABASE_BUCKET: Joi.string().allow('').optional(),

    // Empty string allowed — main.ts falls back to http://localhost:5173 when absent.
    CLIENT_URL: Joi.string().uri().allow('').optional(),
});
