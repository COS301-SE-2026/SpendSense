# Demo Seeding Runbook

This runbook prepares one Supabase-authenticated demo account with the internal SpendSense data needed by the frontend integration flow.

The critical rule is that `User.supabaseAuthId` in the app database must exactly equal the Supabase Auth user ID from the access token `sub`. If those values do not match, `GET /api/v1/users/me` will create a new empty internal user and the demo seed will not appear in the frontend.

## Seeded Walkthrough Coverage

The demo seed in `backend/prisma/seed/demo.ts` creates data for the current Demo 1 API surface:

| Integration screen | Endpoint | Seed coverage |
|---|---|---|
| Login | `GET /users/me` | Internal user, preferences, notification preferences, credit profile, gamification profile |
| Dashboard | `GET /dashboard` | Score events, upcoming payments, overdue payment, badges, unread notifications |
| Create Obligation | `GET /categories`, `POST /obligations` | Required category reference data remains seeded separately and is rerunnable |
| Calendar / Timeline | `GET /payment-occurrences/upcoming`, `GET /payment-occurrences/:id` | May and June 2026 pending and overdue occurrences with reminders |
| Pay for Something | `POST /payments/log` | Payable pending occurrences with exact `amountDue` values |
| Impact Popup | payment response | Existing baseline score and rewards make the payment impact visible |
| Profile / Settings | `GET /users/me`, obligation edit/delete | Active obligations owned by the demo user |
| Rewards / Badges | `GET /gamification/profile` | Earned badges and gamification totals |

## One-Time Supabase Setup

1. Open your Supabase project.
2. Create a dedicated demo Auth user, for example `demo@spendsense.local`, with a known password.
3. Copy the Auth user ID from Supabase. This is the UUID that appears as the JWT `sub`.
4. Add these values to the repo root `.env`:

```text
SUPABASE_TEST_EMAIL=demo@spendsense.local
SUPABASE_TEST_PASSWORD=<demo-password>
DEMO_USER_EMAIL=demo@spendsense.local
DEMO_SUPABASE_AUTH_ID=<supabase-auth-user-id>
DEMO_DISPLAY_NAME=Demo Student
```

`SUPABASE_TEST_EMAIL` and `SUPABASE_TEST_PASSWORD` are used by `npm run dev:token`. `DEMO_USER_EMAIL` and `DEMO_SUPABASE_AUTH_ID` are used by the Prisma demo seed.

If the Docker stack was already running when you changed `.env`, recreate the backend container so `docker compose exec backend ...` receives the new seed variables:

```powershell
docker compose up -d --force-recreate backend
```

## Seed The Database

From the repo root, with the Docker stack running:

```powershell
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run prisma:seed
docker compose exec backend npm run prisma:seed:demo
docker compose exec backend npm run prisma:smoke
```

The required seed is safe to rerun. The demo seed is also rerunnable: it updates or creates the configured demo internal user, clears that user's dependent demo records, and recreates the walkthrough data.

## Verify The Auth Link

Get a real Supabase access token for the same demo account:

```powershell
npm run dev:token
```

The helper prints a `User ID`. It must match `DEMO_SUPABASE_AUTH_ID`.

Then either log in through the frontend or paste the printed token into Swagger at:

```text
http://localhost:3000/api/v1/docs
```

Call these endpoints in this order:

```http
GET /api/v1/users/me
GET /api/v1/dashboard
GET /api/v1/payment-occurrences/upcoming?from=2026-05-01&to=2026-06-30
GET /api/v1/gamification/profile
```

Expected high-level results:

- `/users/me` returns `Demo Student`, `ZAR`, score `656`, and coin balance `145`.
- `/dashboard` returns several upcoming payments, one overdue utility payment, recent score events, unread notifications, and earned badges.
- `/payment-occurrences/upcoming` returns payable May and June 2026 occurrences, including `Textbook IOU`, `Netflix`, `Campus Gym`, `Hatfield Rent`, and `Laptop Instalment`.
- `/gamification/profile` returns earned badge definitions, including `FIRST_ON_TIME_PAYMENT`, `THREE_PAYMENT_STREAK`, `SCORE_650_REACHED`, and `DEMO_READY`.

## Common Failure Mode

If the frontend logs in successfully but shows an empty profile, the Supabase Auth user ID used by the JWT does not match `DEMO_SUPABASE_AUTH_ID`. Update `.env`, rerun `docker compose exec backend npm run prisma:seed:demo`, then log out and log back in.
