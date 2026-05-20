# SpendSense Auth Flow

SpendSense uses Supabase for user-facing authentication and NestJS for protected backend APIs.

The backend does not create login sessions for Demo 1. Signup, login, logout, password reset, and session refresh belong to the frontend Supabase client. The backend verifies the Supabase access token and maps it to an internal SpendSense user.

## Runtime Flow

1. The user signs up or logs in through the frontend.
2. Supabase returns a session that includes an `access_token`.
3. The frontend calls protected backend endpoints with:

```http
Authorization: Bearer <supabase_access_token>
```

4. The NestJS `SupabaseJwtGuard` validates the token.
5. The guard attaches the authenticated Supabase user identity to the request.
6. Protected controllers use `@CurrentAuthUser()` to access that identity.
7. `GET /api/v1/users/me` creates or returns the internal SpendSense user record for that Supabase account.
8. Other protected endpoints use the internal `User.id` for ownership checks.

## Protected Endpoint Rules

Protected endpoints must:

- require `Authorization: Bearer <supabase_access_token>`;
- use `SupabaseJwtGuard`;
- use `@CurrentAuthUser()` rather than trusting request body identity fields;
- resolve the internal SpendSense user before reading or writing user-owned data;
- ignore any client-provided `userId` on create operations;
- return `404` instead of `403` when a user tries to access another user's owned resource.

## Frontend Integration

The frontend should use the Supabase client for authentication.

After login, API requests to the NestJS backend should include the current Supabase access token:

```ts
const {
  data: { session },
} = await supabase.auth.getSession();

await fetch(`${API_BASE_URL}/api/v1/users/me`, {
  headers: {
    Authorization: `Bearer ${session?.access_token}`,
  },
});
```

The frontend should call `GET /api/v1/users/me` after login to ensure the internal backend user profile exists before calling other protected endpoints.

## Swagger Manual Testing

Use this flow when testing protected endpoints through Swagger.

1. Start the frontend and backend against the same Supabase project or local Supabase instance.
2. Log in through the frontend.
3. Find the current Supabase access token from the browser session.
4. Open Swagger at:

```text
http://localhost:3000/api/v1/docs
```

5. Click `Authorize`.
6. Paste the raw access token if Swagger already applies the Bearer scheme. If it requires the full value, paste:

```text
Bearer <supabase_access_token>
```

7. Call `GET /api/v1/users/me` first.
8. Use the same authorized Swagger session to test protected endpoints such as:

- `GET /api/v1/categories`
- `POST /api/v1/obligations`
- `POST /api/v1/payments/log`
- `GET /api/v1/dashboard`

### Token Helper Script

There is also a local helper script that can fetch a Supabase access token for a dedicated test user:

```powershell
node scripts/print-supabase-swagger-token.cjs
```

Run it from the repo root. It reads `.env` and expects these values:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_TEST_EMAIL=
SUPABASE_TEST_PASSWORD=
```

The script signs in through Supabase using the test email and password, then prints an access token that can be pasted into Swagger `Authorize`.

Use a dedicated development/test account for this flow. Do not commit real credentials, and do not expose this helper as a backend endpoint.

## Automated Testing

Guard-level tests should use a locally signed JWT with the test `SUPABASE_JWT_SECRET`.

Endpoint behavior tests may override `SupabaseJwtGuard` and inject an `authUser` into the request. This keeps endpoint tests fast and avoids real Supabase network calls.

Service tests should not know about Supabase or JWTs. Services should receive either the internal `userId` or an `AuthUser` for bootstrap flows.
