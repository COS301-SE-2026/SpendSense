import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify } from 'jose';
import { SupabaseJwtGuard } from './supabase-jwt.guard';

jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(),
  decodeProtectedHeader: jest.fn(),
  jwtVerify: jest.fn(),
}));

function createExecutionContext(request: Partial<Request>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as ExecutionContext;
}

describe('SupabaseJwtGuard', () => {
  const originalSecret = process.env.SUPABASE_JWT_SECRET;
  const decodeProtectedHeaderMock = jest.mocked(decodeProtectedHeader);
  const jwtVerifyMock = jest.mocked(jwtVerify);
  const createRemoteJwkSetMock = jest.mocked(createRemoteJWKSet);

  beforeEach(() => {
    process.env.SUPABASE_JWT_SECRET = 'test-secret';
    decodeProtectedHeaderMock.mockReturnValue({ alg: 'HS256' });
    jwtVerifyMock.mockReset();
    createRemoteJwkSetMock.mockReset();
  });

  afterAll(() => {
    if (originalSecret === undefined) {
      delete process.env.SUPABASE_JWT_SECRET;
      return;
    }

    process.env.SUPABASE_JWT_SECRET = originalSecret;
  });

  it('rejects requests without an authorization header', async () => {
    const guard = new SupabaseJwtGuard();
    const context = createExecutionContext({
      headers: {},
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Missing or malformed Authorization header'),
    );
  });

  it('rejects malformed authorization headers', async () => {
    const guard = new SupabaseJwtGuard();
    const context = createExecutionContext({
      headers: {
        authorization: 'Token abc123',
      },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Missing or malformed Authorization header'),
    );
  });

  it('rejects invalid tokens', async () => {
    jwtVerifyMock.mockRejectedValue(new Error('bad token'));

    const guard = new SupabaseJwtGuard();
    const context = createExecutionContext({
      headers: {
        authorization: 'Bearer invalid-token',
      },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Invalid or expired token'),
    );
  });

  it('rejects tokens without a subject claim', async () => {
    jwtVerifyMock.mockResolvedValue({
      payload: {
        email: 'test-user-1@example.com',
      },
    } as Awaited<ReturnType<typeof jwtVerify>>);

    const guard = new SupabaseJwtGuard();
    const context = createExecutionContext({
      headers: {
        authorization: 'Bearer valid-token',
      },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Token subject is missing'),
    );
  });

  it('accepts valid tokens', async () => {
    jwtVerifyMock.mockResolvedValue({
      payload: {
        sub: 'test-supabase-user-1',
        email: 'test-user-1@example.com',
      },
    } as Awaited<ReturnType<typeof jwtVerify>>);

    const guard = new SupabaseJwtGuard();
    const context = createExecutionContext({
      headers: {
        authorization: 'Bearer valid-token',
      },
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('attaches authUser for valid tokens', async () => {
    jwtVerifyMock.mockResolvedValue({
      payload: {
        sub: 'supabase-user-123',
        email: 'student@example.com',
        user_metadata: {
          display_name: 'Student User',
        },
      },
    } as Awaited<ReturnType<typeof jwtVerify>>);

    const request = {
      headers: {
        authorization: 'Bearer valid-token',
      },
    };
    const guard = new SupabaseJwtGuard();
    const context = createExecutionContext(request);

    await guard.canActivate(context);

    expect((request as Request & { authUser?: unknown }).authUser).toEqual({
      supabaseAuthId: 'supabase-user-123',
      email: 'student@example.com',
      displayName: 'Student User',
    });
  });

  it('sets displayName to null when the token has no display name metadata', async () => {
    jwtVerifyMock.mockResolvedValue({
      payload: {
        sub: 'supabase-user-123',
        email: 'student@example.com',
      },
    } as Awaited<ReturnType<typeof jwtVerify>>);

    const request = {
      headers: {
        authorization: 'Bearer valid-token',
      },
    };
    const guard = new SupabaseJwtGuard();

    await guard.canActivate(createExecutionContext(request));

    expect((request as Request & { authUser?: unknown }).authUser).toEqual({
      supabaseAuthId: 'supabase-user-123',
      email: 'student@example.com',
      displayName: null,
    });
  });
});
