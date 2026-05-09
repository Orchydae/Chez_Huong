import { Global, Module } from '@nestjs/common';
import { SupabaseExternal } from './external/supabase.external';

@Global()
@Module({
    providers: [SupabaseExternal],
    exports: [SupabaseExternal],
})
export class SharedModule { }
