# SpendSense E2E Test Support

This folder is the shared foundation for API and browser end to end tests. It owns E2E-only data setup, authentication helpers, and database safety checks. Feature E2E files own user actions and assertions.

## Before writing a test

1. Start the isolated environment with `npm run e2e:up`.
2. Before the first browser run, install Chromium with `npm --prefix frontend exec -- playwright install chromium`.
3. Run the API suite with `npm run test:e2e:api`.
4. Run the browser suite with `npm run test:e2e:ui`. The command resets the E2E database and creates the controlled browser session automatically.
5. Remove the environment and its E2E database volume with `npm run e2e:down`.

The environment uses only the `spendsense_e2e` database. Do not point an E2E command at local development, hosted Supabase, or production data.

## Where to put a test

| Test type | Location | Purpose |
| --- | --- | --- |
| API E2E | `backend/test/e2e/<feature>.e2e-spec.ts` | Exercise real Nest HTTP endpoints and the E2E database. |
| Browser E2E | `frontend/e2e/<feature>.spec.ts` | Exercise the browser, frontend, API, and E2E database together. |
| Factory | `test-support/factories/<domain>.ts` | Create one valid record with predictable defaults. |
| Scenario | `test-support/scenarios/<domain>.ts` | Create a reusable named business starting state. |

## Factory or scenario

Use a factory for an individual record or a test-specific setup. Use a scenario only when several tests need the same meaningful business state.

```ts
const user = await createUser(prisma);
```

```ts
const { user, occurrence } = await scenario.payments.userWithPayableOccurrence();
```

Factories and scenarios create data only. They must not click browser controls, call feature endpoints, or make assertions.

## Rules for every E2E spec

1. Use the shared fixture and factory or scenario functions.
2. Create all data needed by the test. Do not depend on a previous test or developer data.
3. Use an isolated user for ownership and permission checks.
4. Assert user-visible behaviour in browser tests, and real status and response behaviour in API tests.
5. Never add a second Compose file, database reset script, token workaround, or global cleanup routine.
6. Use accessible selectors such as roles, labels, and visible text. Add `data-testid` only when those cannot identify the element reliably.

## Authentication status

API E2E tests use E2E-only HS256 tokens signed with `SUPABASE_JWT_SECRET`. The helper in `auth/e2e-auth.ts` creates those tokens. Browser E2E uses the same E2E-only signing secret, but the token is created by `scripts/run-e2e-ui.cjs` outside the browser.

`auth.setup.ts` stores the token in Playwright storage state, and every Chromium test reuses that state. The feature scenario creates the matching internal SpendSense user and any other test data. The frontend recognises the stored token only when `VITE_E2E_MODE=true`. It throws if that mode is included in a production build.

Do not use a hosted Supabase account, Supabase credentials, or a production secret for E2E tests.

## Reset lifecycle

`createApiE2eFixture()` resets and reseeds the E2E database when a new API fixture is created. Browser E2E runs `npm run e2e:reset` before Playwright starts. Both paths refuse non-E2E database names.

## Completion checklist

- A high-value happy path passes through the real system.
- Relevant authorization or failure behaviour is covered by an API E2E test.
- The spec creates only managed E2E data.
- The normal E2E command passes locally.
- The test is deterministic and independent.
