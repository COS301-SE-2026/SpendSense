# SpendSense Backend

NestJS API service for SpendSense.

## Development

The recommended team workflow runs the backend through Docker Compose from the repository root:

```bash
npm run dev:up:build
```

Backend logs:

```bash
npm run dev:logs:back
```

Backend shell:

```bash
npm run dev:shell:back
```

## Database

Prisma is the source of truth for the backend database schema.

From the repository root, with the Docker stack running:

```bash
docker compose exec backend npx prisma migrate dev --name init
docker compose exec backend npm run prisma:seed
docker compose exec backend npm run prisma:seed:demo
docker compose exec backend npm run prisma:smoke
```

Useful inspection commands:

```bash
docker compose exec backend npx prisma migrate status
docker compose exec backend npx prisma studio
docker compose exec postgres psql -U spendsense -d spendsense_dev
```

The required seed is safe to rerun. The demo seed recreates only the local demo user's related records so it can also be rerun safely.

The dev container runs `prisma generate` before starting NestJS, which keeps Prisma Client available after fresh container builds or renewed anonymous volumes.

## Checks

From the repository root, the default CI-style checks run inside Docker:

```bash
npm run test:ci
```

Backend-only local fallback commands:

```bash
npm --prefix backend run lint
npm --prefix backend run test
npm --prefix backend run build
```
