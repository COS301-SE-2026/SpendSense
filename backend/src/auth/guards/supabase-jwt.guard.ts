import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { jwtVerify } from 'jose';
import { Request } from 'express';
import type { AuthUser } from '../types/auth-user.type';

// supabase jwt guard: validates the Bearer token in the Authorisation header using the
// SUPABASE_JWT_SECRET (HS256)
// attached typed AuthUser to request.authUser on success for @CurrentAuthUser()
/**
 * Usage:
 *   @UseGuards(SupabaseJwtGuard)
 *   @Get('protected-route')
 *   doSomething(@CurrentAuthUser() user: AuthUser) { ... }
 */

@Injectable()
export class SupabaseJwtGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractBearerToken(request);

    if (!token) {
      throw new UnauthorizedException(
        'Missing or malformed Authorization header',
      );
    }

    const secret = process.env.SUPABASE_JWT_SECRET;
    if (!secret) {
      throw new UnauthorizedException('JWT secret not configured');
    }

    try {
      const encoder = new TextEncoder();
      const { payload } = await jwtVerify(token, encoder.encode(secret));

      const authUser: AuthUser = {
        supabaseAuthId: payload.sub ?? '',
        email: (payload.email as string | undefined) ?? null,
      };

      // attach to request in order for @CurrentAuthUser() to read
      (request as Request & { authUser: AuthUser }).authUser = authUser;

      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractBearerToken(request: Request): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    return authHeader.slice(7);
  }
}
