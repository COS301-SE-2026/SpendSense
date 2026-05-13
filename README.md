# SpendSense

SpendSense is the COS301 2026 capstone project monorepo.

The repository currently contains:

- `frontend/`: React + TypeScript app created with Vite
- `backend/`: NestJS API
- `ai/`: FastAPI placeholder AI service
- `docs/`: project documentation
- `scripts/`: helper scripts for local development and automation
- `docker-compose.yml`: local multi-service development stack

## Current Stack

The local development environment includes:

- React frontend on `http://localhost:5173`
- NestJS backend on `http://localhost:3000`
- FastAPI AI service on `http://localhost:8000`
- PostgreSQL on port `5432`
- MinIO on `http://localhost:9001`

## Prerequisites

Before starting, make sure you have:

- Git
- Node.js and npm
- Docker Desktop

Docker Desktop must be running before you start the local stack.

## Getting Started

Clone the repository and switch to the shared development branch:

```powershell
git clone https://github.com/COS301-SE-2026/SpendSense.git
cd SpendSense
git checkout dev
```

Create your local environment file:

```powershell
Copy-Item .env.example .env
```

Start the development stack:

```powershell
npm run dev:up
```

If you need Docker to rebuild the images first, use:

```powershell
npm run dev:up:build
```

## Useful Commands

From the repo root:

```powershell
npm run dev:up
npm run dev:up:build
npm run dev:down
npm run dev:logs
npm run dev:restart
```

What they do:

- `npm run dev:up`: starts the stack in the background
- `npm run dev:up:build`: rebuilds images, then starts the stack in the background
- `npm run dev:down`: stops the stack
- `npm run dev:logs`: follows container logs
- `npm run dev:restart`: stops the stack, then starts it again with a rebuild

## First Run Notes

On a new machine, the first Docker build may take a long time because base images and dependencies need to be downloaded.

Once the stack is running, check:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`
- AI health: `http://localhost:8000/health`
- AI OpenAPI spec: `http://localhost:8000/openapi.json`
- MinIO: `http://localhost:9001`

## Git Workflow

Normal development should happen from `dev`.

Intended flow:

```text
feature branch -> dev -> release -> main
```

Do not scaffold the frontend, backend, or AI service again on a fresh clone. Those project files are already tracked in this repository.
