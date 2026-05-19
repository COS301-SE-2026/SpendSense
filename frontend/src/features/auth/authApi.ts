import {apiFetch} from '../../lib/api'

// authApi: Supabase Auth bridge
// auth calls (signIn, signUp, signOut) go through auth.service.ts
// any future NestJS auth wrapper endpoints goes into this file

// planned endpoints:
// POST /api/v1/auth/register
// POST /api/v1/auth/login
// POST /api/v1/auth/logout

void apiFetch