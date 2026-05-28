# API E2E Tests

The Fortuna API E2E suite runs through Vitest against an in-process NestJS app
listening on a random local port. The suite is HTTP-first: tests call the public
API endpoints with `fetch` and validate the same JSON contracts used by clients.

## Command

```bash
pnpm test:e2e
```

At the API workspace level this expands to:

```bash
vitest run .e2e.test.ts
```

From the repository root, the official commands are:

```bash
pnpm test:e2e
corepack pnpm --filter @fortuna/api test:e2e
```

## Organization

The suite covers every `test/**/*.e2e.test.ts` file:

- `financial-api.e2e.test.ts`: smoke test for the complete financial cycle.
- `players.e2e.test.ts`: player creation, lookup, wallet bootstrap, and input validation.
- `assets.e2e.test.ts`: asset catalog, price, history, missing assets, and mock refresh.
- `orders.e2e.test.ts`: buy/sell success paths and predictable order failures.
- `portfolio.e2e.test.ts`: wallet, portfolio, allocation, and summary views.
- `income-transactions.e2e.test.ts`: income collection and transaction history.
- `game-loop-education.e2e.test.ts`: Mentor, missions, city, and game-loop state.
- `market-data.e2e.test.ts`: market-data provider endpoints with real data disabled.

## Test Helpers

Shared HTTP helpers live in `apps/api/test/test-http.ts`:

- `createTestApp()` starts the Nest app on a random local port and disables real market data.
- `closeTestApp(app)` closes the Nest application after each test.
- `readJson<T>(response)` returns status, headers, and parsed JSON body.
- `expectApiError(response, expected)` validates predictable API errors by status, `error.code`, and `correlationId` when present.

## Determinism Rules

Automated E2E tests must not require internet access, brapi, PostgreSQL, or a
development database. Market refresh tests use fixed dates when asserting price
updates. Monetary values are asserted as integer cents; floats must not be used
as source-of-truth values in request payloads or expected financial totals.
