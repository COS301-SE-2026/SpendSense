import {
  UnauthorizedException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import { Request } from 'express';
import type { AuthUser } from '../../auth/types/auth-user.type';

// param decorator that extracts authenticated user from the request
// used on routes protected by @UseGuards(SupabaseJwtGuard) (must be used on these)
/**
 * Usage:
 *   @Get('me')
 *   @UseGuards(SupabaseJwtGuard)
 *   getMe(@CurrentAuthUser() user: AuthUser){
 *     return user
 *   }
 */

export const CurrentAuthUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { authUser?: AuthUser }>();

    if (!request.authUser) {
      throw new UnauthorizedException('Authenticated user context missing');
    }

    return request.authUser;
  },
);
