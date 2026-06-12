import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';

/**
 * Thin Supabase Storage client used for recipe image uploads.
 * Uses the service role key, so all uploads bypass RLS — this is server-side
 * only and must never be re-exposed to the browser.
 */
@Injectable()
export class SupabaseService {
    private readonly client: ReturnType<typeof createClient>;
    private readonly bucket: string;

    constructor(config: ConfigService) {
        const url = config.getOrThrow<string>('SUPABASE_URL');
        const serviceRoleKey = config.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY');
        this.bucket = config.get<string>('SUPABASE_BUCKET') ?? 'Chez Huong Medias';
        this.client = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
    }

    /**
     * Uploads a file buffer to Supabase Storage. Returns the public URL.
     * Throws InternalServerErrorException if the upload fails.
     */
    async uploadFile(fileName: string, buffer: Buffer, mimeType: string): Promise<string> {
        const { error } = await this.client.storage
            .from(this.bucket)
            .upload(fileName, buffer, { contentType: mimeType, upsert: false });

        if (error) {
            throw new InternalServerErrorException(`Supabase upload failed: ${error.message}`);
        }

        const { data } = this.client.storage.from(this.bucket).getPublicUrl(fileName);
        return data.publicUrl;
    }
}
