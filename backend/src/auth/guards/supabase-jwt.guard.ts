import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify } from 'jose';
import { Request } from 'express';
import type { AuthUser } from '../types/auth-user.type';

// supabase jwt guard: validates the Bearer token from the Authorization header.
// supports both legacy HS256 JWT secret verification and modern Supabase JWKS
// verification for asymmetric signing keys such as ES256/RS256.
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

    try {
      const { payload } = await this.verifyToken(token);
      const authUser = this.buildAuthUser(payload);

      // attach to request in order for @CurrentAuthUser() to read
      (request as Request & { authUser: AuthUser }).authUser = authUser;

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractBearerToken(request: Request): string | null {
    const authHeader = request.headers.authorization?.trim();
    if (!authHeader) {
      return null;
    }

    const [scheme, ...tokenParts] = authHeader.split(' ');
    const token = tokenParts.join(' ').trim();

    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      return null;
    }

    return token;
  }

  private buildAuthUser(payload: { sub?: string; email?: unknown }): AuthUser {
    if (!payload.sub) {
      throw new UnauthorizedException('Token subject is missing');
    }

    return {
      supabaseAuthId: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : null,
    };
  }

  private async verifyToken(token: string) {
    const { alg } = decodeProtectedHeader(token);

    if (alg === 'HS256') {
      const secret = process.env.SUPABASE_JWT_SECRET;
      if (!secret) {
        throw new UnauthorizedException('JWT secret not configured');
      }

      const encoder = new TextEncoder();
      return jwtVerify(token, encoder.encode(secret));
    }

    const supabaseUrl = this.getSupabaseUrl();
    const issuer = `${supabaseUrl}/auth/v1`;
    const jwks = createRemoteJWKSet(
      new URL(`${issuer}/.well-known/jwks.json`),
    );

    return jwtVerify(token, jwks, {
      issuer,
    });
  }

  private getSupabaseUrl(): string {
    const supabaseUrl =
      process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;

    if (!supabaseUrl) {
      throw new UnauthorizedException('Supabase URL not configured');
    }

    return supabaseUrl.replace(/\/$/, '');
  }
}
