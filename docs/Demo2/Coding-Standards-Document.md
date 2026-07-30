# SpendSense Coding Standards

## 1. Purpose

These standards give the team one shared way to organise, write, review, and maintain SpendSense code. They apply to new work and to existing code when that code is changed. They are intended to keep the project readable, predictable, safe, and easy to test.


## 2. Repository structure

SpendSense is a monorepo with three application services and shared project support.

```text
SpendSense/
|-- .github/
|   |-- ISSUE_TEMPLATE/       GitHub issue templates
|   `-- workflows/            Pull request, release, E2E, Docker, and docs checks
|-- ai/
|   |-- tests/                Pytest tests
|   |-- main.py               FastAPI application
|   `-- requirements*.txt     Python runtime and development dependencies
|-- backend/
|   |-- prisma/
|   |   |-- migrations/       Committed database migrations
|   |   |-- seed/             Required and demo seed data
|   |   `-- schema.prisma     Database schema
|   |-- scripts/              Backend maintenance scripts
|   |-- src/                  NestJS application code
|   `-- test/                 API E2E tests
|-- docs/                     Project and technical documentation
|-- frontend/
|   |-- e2e/                  Playwright browser tests
|   |-- public/               Static public assets
|   `-- src/
|       |-- components/       Reusable interface components
|       |-- domains/          Route-level pages and feature screens
|       |-- features/         API clients and feature-specific state
|       |-- hooks/            Shared React hooks
|       |-- lib/              Cross-cutting frontend utilities
|       |-- test/             Vitest tests and test setup
|       `-- types/            Shared frontend types
|-- scripts/                  Repository-level helper scripts
|-- test-support/             Shared E2E factories, scenarios, auth, and database reset code
|-- docker-compose*.yml       Development, production, and E2E environments
|-- package.json              Root commands
`-- README.md                 Project entry point
```



## 3. General code style
* Two spaces for indentation.
* One statement per line.
* Single quotes.
* Braces for control-flow blocks, including one-line blocks.
* Blank lines used to separate ideas.
* Prefer `const`. 
* Use `let` only when a variable is reassigned. 
* Do not use `var`.
* Avoid `any`.
  * _BUT_ If `any` is required at a third-party boundary, keep it local and add a short reason.
* Use a specific type, a generic, or `unknown` with a type check. 


## 4. Naming conventions

| Item | Convention | Example |
| --- | --- | --- |
| TypeScript variable or function | `camelCase` | `currentUserId`, `createObligation` |
| React hook | `use` followed by `PascalCase` | `useCalendarOccurrences` |
| Class, interface, type, DTO, component | `PascalCase` | `PaymentsService`, `AuthUser`, `CreateObligationDto` |
| Constant | `UPPER_SNAKE_CASE` | `OCCURRENCE_HORIZON_MONTHS` |
| Boolean | Question wording | `isActive`, `hasError`, `canSubmit` |
| Backend file | lowercase dash with Nest applicatory role | `payment-occurrences.service.ts` |
| DTO file | lowercase dash ending in `.dto.ts` | `create-obligation.dto.ts` |
| React component or page file | `PascalCase.tsx` | `DashboardPage.tsx` |
| Frontend API module | `camelCaseApi.ts` | `notificationsApi.ts` |
| Prisma model | singular `PascalCase` | `PaymentRecord` |
| Prisma field | `camelCase` | `supabaseAuthId` |
| Enum  | `UPPER_SNAKE_CASE` | `PAID_LATE` |
| Environment variable | `UPPER_SNAKE_CASE` | `DATABASE_URL` |


## 5. Backend standards

*The backend follows the NestJS feature-module pattern.* A normal backend feature contains:

```text
feature/
|-- dto/
|   `-- create-feature.dto.ts
|-- feature.controller.ts
|-- feature.controller.spec.ts
|-- feature.module.ts
|-- feature.service.ts
`-- feature.service.spec.ts
```

* **Controllers** handle HTTP concerns. They read the authenticated user, validate route inputs through DTOs, call a service, and return the service result. Business rules and Prisma operations belong in services.

* **Modules** declare controllers, providers, imports, and exports. Use constructor injection and mark injected fields `private readonly` unless another access level is required.


## 6. Frontend standards

React components are function components. Route-level screens belong in `frontend/src/domains`. Reusable interface code belongs in `components`, and server communication belongs in a *feature API module*.

* Regarding **Components and hooks** Move reusable request and state logic into a hook or feature module and define a named props type or interface for a component with more than a few simple props.
* For **API access**make use of the shared `apiFetch` helper for authenticated backend requests. Put endpoint-specific calls and request or response types in the relevant `features/<name>` API module.
* For **styling** Use Tailwind utilities and the shared CSS variables in `frontend/src/index.css`.


## 7. Database standards

`backend/prisma/schema.prisma` is the database schema source of truth.

- Change the schema through Prisma, then create and commit a migration.
- Give migrations a short name that describes the schema change.
- Never edit a migration that has already been applied by another developer or environment.
- Do not make manual production schema changes outside the migration process.
- Add indexes for fields used often in filtering, ownership checks, ordering, or uniqueness.
- Use explicit relation names only when Prisma cannot infer the relation clearly.
- Use `createdAt`, `updatedAt`, and `deletedAt` consistently where records need auditing or soft deletion.
- Seed required reference data through `backend/prisma/seed`.
- Keep demo-only records in the demo seed.

Destructive database commands must target the intended local or E2E database. E2E reset code must keep its `_e2e` database-name guard.


## 8. Git and pull request actions

* Development work starts from `dev`. 
* Feature work is merged into `dev` by pull request. 
* `dev` is merged into `release`
* Finally milestone releases move from `release` to `main`.

Use short branch names with a category:

```text
feature/payment-history
fix/reminder-timezone
docs/coding-standards
test/quiz-session
chore/update-dependencies
```



## 9. Automated Builds, Linting and Tests

| Area | Configuration | Enforcement |
| --- | --- | --- |
| Backend TypeScript | `backend/eslint.config.mjs` | ESLint recommended rules, typed TypeScript rules, and Prettier |
| Backend compiler | `backend/tsconfig.json` | ES2023, null checking, casing checks, decorators, and build output |
| Frontend TypeScript | `frontend/eslint.config.js` | ESLint, TypeScript, React Hooks, and Vite refresh rules |
| Frontend compiler | `frontend/tsconfig.app.json` | Unused code checks, switch fallthrough checks, browser types, and no emit |
| Database | `backend/prisma/schema.prisma` | Prisma schema and generated client |
| Pull requests | `.github/workflows/pr-checks.yml` | Secret scan, lint, test, and build |
| Releases | `.github/workflows/release-checks.yml` | Secret scan, lint, tests, backend coverage, and build |

Run the full Docker-based check from the repository root:

```bash
npm run test:ci
```

Local checks are available when all local dependencies are installed:

```bash
npm run local:lint
npm run local:test
npm run local:build
```

Useful focused checks are:

```bash
npm --prefix backend run lint
npm --prefix backend run test
npm --prefix backend run build
npm --prefix frontend run lint
npm --prefix frontend run test:ci
npm --prefix frontend run build
cd ai && python -m ruff check .
cd ai && python -m pytest
```