import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SupabaseAuthClient = {
  provide: SupabaseClient,
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    return createClient(
      configService.get<string>('SUPABASE_URL', ''),
      configService.get<string>('SUPABASE_KEY', ''),
    );
  },
};

@Module({
  imports: [ConfigModule],
  providers: [SupabaseAuthClient],
  exports: [SupabaseClient],
})
export class SupabaseClientModule {}
