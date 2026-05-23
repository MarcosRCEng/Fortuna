# Fortuna

Fortuna is a gamified financial education and investing platform. The core experience will be Cidade Fortuna, a visual city that grows as the player builds wealth, diversifies investments, receives yields, and improves financial maturity.

The project starts with mocked market data, but the architecture is prepared for future integrations with providers such as Brapi, B3 for Developers, MSN Money, Google Finance, or equivalent services.

## Central Financial Rule

1 Fortuna coin = R$ 0.01.

All money is represented internally as integer cents. Floats are not a source of truth. The MVP must not allow negative balances, purchases without balance, selling more than the current position, or leverage.

## Technical Stack

- TypeScript monorepo
- pnpm workspaces
- NestJS API
- React + Vite + TypeScript web app
- PostgreSQL
- Prisma
- Vitest
- Swagger/OpenAPI
- Pino structured logs
- Simplified Clean Architecture
- Ports and Adapters
- Lightweight Domain-Driven Design

## Monorepo Structure

- `apps/api`: NestJS back-end and HTTP adapters.
- `apps/web`: React front-end.
- `packages/domain`: financial domain rules and entities.
- `packages/application`: use cases and ports.
- `packages/infrastructure`: adapters for providers, logging, and future persistence.
- `packages/shared`: shared errors and result primitives.
- `packages/testing`: shared test builders, fixtures, and mocks.
- `docs`: architecture, ADRs, API notes, and gameplay references.

## Setup

```bash
pnpm install
```

Copy `.env.example` to `.env` for local development and keep `DATABASE_URL`
pointing to PostgreSQL. The default development URL is:

```bash
DATABASE_URL=postgresql://fortuna:fortuna_dev@localhost:5432/fortuna
```

## Run PostgreSQL And Prisma

```bash
docker compose up -d
pnpm prisma:migrate
pnpm prisma:generate
corepack pnpm --filter @fortuna/infrastructure db:seed
```

The API uses in-memory adapters by default so unit tests remain fast and
isolated. To run the API with PostgreSQL persistence, set:

```bash
FORTUNA_PERSISTENCE=prisma
```

## Run The API

```bash
pnpm dev:api
```

The API starts on `API_PORT`, defaulting to `3000`. Swagger is available at `/docs`.

## Run The Web App

```bash
pnpm dev:web
```

The web app starts on Vite's default port, currently `5173`.

## Run Tests

```bash
pnpm test
pnpm test:unit
pnpm test:integration
pnpm test:coverage
```

## Build

```bash
pnpm build
```

## Current Status

Bootstrap inicial: monorepo, domain foundation, application ports, infrastructure adapters, API health endpoint, web bootstrap screen, documentation, tests, and build scripts.

## Quality Documentation

- `docs/testing-strategy.md`
- `docs/logging-strategy.md`
- `docs/api-testing.md`
- `docs/technical-readiness-checklist.md`
