import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseExternal {
    private readonly client: SupabaseClient;
    private readonly bucket: string;

    constructor(private readonly configService: ConfigService) {
        const url = this.configService.getOrThrow<string>('SUPABASE_URL');
        const serviceRoleKey = this.configService.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY');
        this.bucket = this.configService.get<string>('SUPABASE_BUCKET') ?? 'Chez Huong Medias';

        this.client = createClient(url, serviceRoleKey, {
            auth: { persistSession: false },
        });
    }

    /**
     * Uploads a file buffer to Supabase Storage using the service role key
     * (bypasses RLS entirely). Throws if the upload fails.
     *
     * @returns The public URL of the uploaded file
     */
    async uploadFile(
        fileName: string,
        buffer: Buffer,
        mimeType: string,
    ): Promise<string> {
        const { error } = await this.client.storage
            .from(this.bucket)
            .upload(fileName, buffer, {
                contentType: mimeType,
                upsert: false,
            });

        if (error) {
            throw new InternalServerErrorException(
                `Supabase upload failed: ${error.message}`,
            );
        }

        const { data } = this.client.storage
            .from(this.bucket)
            .getPublicUrl(fileName);

        return data.publicUrl;
    }
}
