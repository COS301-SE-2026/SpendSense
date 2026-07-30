# SpendSense Testing Policy



## 1. Purpose

Testing gives the team evidence that a change works, does not break an existing feature, and is safe to merge. The focus is on behaviour that matters to a user, especially authentication, financial calculations, payment state changes, dates, validation, and ownership of data.

## 2. Scope

This policy covers:

- automated tests for the NestJS backend;
- component and integration tests for the React frontend;
- API and browser end-to-end tests;
- test data, mocks, fixtures, and scenarios;
- checks run locally and in GitHub Actions;
- recording failures and reviewing test results.

Manual checks may support exploratory work and demonstrations, but they do not replace an automated regression test when the behaviour can be tested reliably.

## 3. Test levels and tools

| Test level | Tool | Location | Main purpose |
| --- | --- | --- | --- |
| Backend unit and component | Jest, Nest testing utilities | Beside backend source as `*.spec.ts` | Test services, controllers, guards, DTOs, and business rules with controlled dependencies |
| Frontend component | Vitest, Testing Library, jsdom | `frontend/src/test/*.test.tsx` | Test rendered states and user interaction |
| Frontend integration | Vitest, Testing Library, jsdom | `frontend/src/test/*.integration.test.tsx` | Test a page or flow across several frontend modules |
| API end-to-end | Jest, Supertest, PostgreSQL | `backend/test/e2e/*.e2e-spec.ts` | Test real HTTP handling, authentication, persistence, and response contracts |
| Browser end-to-end | Playwright, Chromium, PostgreSQL | `frontend/e2e/*.spec.ts` | Test a user flow through the frontend and backend |

Linting, type checking, building, Docker validation, and secret scanning are quality gates. They support testing, but they are not counted as behavioural tests.


## 4. File names and placement

Use names that are discovered by the configured test runner:

- backend source tests: `<source-name>.spec.ts`;
- frontend component tests: `<feature>.test.tsx` or `<module>.test.ts`;
- frontend integration tests: `<flow>.integration.test.tsx`;
- API end-to-end tests: `<feature>.e2e-spec.ts`;
- browser end-to-end tests: `<feature>.spec.ts`.

Backend tests stay beside the source they cover. Frontend tests stay in `frontend/src/test`. Full system tests stay in the existing E2E directories. Shared E2E data code belongs in `test-support`.


## 5. Test writing rules

Each test should:

1. Describe one behaviour in plain language.
2. Arrange only the data needed for that behaviour
3. Perform the action being tested.
4. Assert the visible result / returned value / state change.
5. Give the same result when repeated.

<br>

* Use `beforeEach` for fresh mocks and common setup. 
* Restore changed environment variables, timers, browser APIs, and global functions after the test. 
* Await asynchronous work and use `findBy` or `waitFor` when the interface updates later.

<br>

Mocks should represent a boundary, such as *Prisma*, *Supabase*, an *HTTP request*, or *another service*, but **ensure that you do not mock the functionality that contains the behaviour under test**. Use real application configuration and a real database in E2E tests.

Frontend tests should prefer accessible queries in this order:

1. Role and accessible name;
2. label text;
3. visible text;
4. `data-testid` only when the page has no stable user-facing selector.

<br>

* `userEvent` is applied for normal user actions. 
* `fireEvent` is acceptable for a browser event that `userEvent` cannot express clearly. 
* Assertions should focus on behaviour instead of CSS classes or internal component state.


## 6. Test data and isolation

**Unit and frontend tests** use *small, readable* data objects with values relevant to the case. Reset mocks between tests and *do not depend on data created by another test.*

**API and browser E2E tests** use the shared support in `test-support`:

- *Factories* create one valid record with predictable defaults.
- *Scenarios* create a named business state from one or more factories.
- *API tests* create their own authenticated user and data.
- *browser tests* provision their state through the E2E scenario service.

**E2E database names** must end in `_e2e`. The reset code checks this suffix before truncating tables. E2E tests must never use the development database, hosted Supabase data, production data, real user accounts, or production secrets.

Tests must not call live third-party services. For example,supabase authentication is mocked or replaced with E2E-only signed tokens. New external integrations should receive the same treatment unless a separate, approved integration environment is provided.

## 7. Running the tests

### 7.1 Standard local check

From the repository root:

```bash
npm run test:ci
```

This runs linting, the backend, frontend, and AI tests, followed by backend and frontend builds in Docker.

Developers with all local dependencies installed may use:

```bash
npm run local:test
```

Useful focused commands are:

```bash
npm --prefix backend run test
npm --prefix backend run test:cov
npm --prefix frontend run test:ci
cd ai && python -m pytest
```

### 7.2 End-to-end check

Use the isolated E2E stack:

```bash
npm run e2e:up
npm run test:e2e:api
npm run test:e2e:ui
npm run e2e:down
```

`npm run test:e2e` runs the complete API and browser flow. The environment must be stopped after the run so that its containers and database volume do not remain in use.

## 8. Pull request and release rules

Before opening a pull request, the author must:

- run `npm run test:ci` before requesting review;
- run the E2E suite when the change affects a critical user flow, authentication, API integration, database behaviour, or E2E support;
- state what was tested in the pull request;
- add or update tests where behaviour changed.* 

* Pull requests into `dev` run secret scanning, linting, unit and integration tests, and builds. 
* Pull requests into `release` run the same checks, collect backend coverage, and run the API and browser E2E suites.


