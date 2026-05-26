# Fortuna

Current milestone: `v0.2.0 - Playable MVP`.

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

The Sprint 15 HTTP flow is covered by `apps/api/test/financial-api.e2e.test.ts`
and runs with the API test suite.

## Build

```bash
pnpm build
```

## MVP Financial API

Swagger is available at `http://localhost:3000/docs`. The minimum financial
cycle is exposed through:

- `POST /players`, `GET /players/:playerId`, `GET /players/:playerId/summary`
- `GET /assets`, `GET /assets/:assetId`, `GET /assets/:assetId/history`,
  `GET /assets/:assetId/price`, `GET /assets/:assetId/yield`
- `GET /players/:playerId/wallet`, `GET /players/:playerId/portfolio`,
  `GET /players/:playerId/portfolio/allocation`
- `POST /players/:playerId/orders/buy`,
  `POST /players/:playerId/orders/sell`
- `GET /players/:playerId/transactions`
- `POST /players/:playerId/income/collect`
- `GET /players/:playerId/missions`
- `GET /players/:playerId/mentor/messages`
- `GET /players/:playerId/city`
- `GET /players/:playerId/game-loop/state`
- `POST /market/refresh-mock-prices`

Money is returned as integer cent fields plus formatted display helpers, for
example `{ "amountCents": 123456, "currency": "FORTUNA", "formatted":
"F$ 1.234,56" }`. Bruno requests for the flow live in
`api-tests/bruno/fortuna`, organized by Players, Assets, Wallet, Portfolio,
Orders, Income, Transactions, Missions, Mentor, City, and Market. The playable
MVP walkthrough is documented in `docs/mvp-playable-flow.md`.

## Current Status

`v0.2.0 - Playable MVP`: Fortuna now has the first complete playable loop for
local/demo use. The milestone includes simulated financial operations,
integer-cent accounting, mock market data, optional Prisma/PostgreSQL
persistence, missions, Mentor Fortuna feedback, Cidade Fortuna progression,
structured logs, seed/demo data, and release documentation.

The previous main baseline is tracked by the suggested tag
`v0.1.0-bootstrap`.

## Quality Documentation

- `docs/testing-strategy.md`
- `docs/logging-strategy.md`
- `docs/api-testing.md`
- `docs/technical-readiness-checklist.md`
- `docs/release-checklist.md`
- `docs/releases/v0.2.0-mvp-playable.md`
