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
