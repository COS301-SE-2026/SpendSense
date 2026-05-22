import { Module } from '@nestjs/common';
import { SupabaseJwtGuard } from './guards/supabase-jwt.guard';

// AuthModule: houses jwt verification infrastructure
// doesn't export the guard directly, the guards are applier per route, or registered globally in main.ts (if needed)

// additions for the future: jwks-based verificatoin, refresh token handling, rate limiting on auth-adjacent endpoints

@Module({
  providers: [SupabaseJwtGuard],
  exports: [SupabaseJwtGuard],
})
export class AuthModule {}
