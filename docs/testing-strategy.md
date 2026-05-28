# Testing Strategy

## Commands

```bash
pnpm test
pnpm test:unit
pnpm test:integration
pnpm test:coverage
```

`pnpm test` runs every workspace test. Unit tests currently live in `packages/domain/test` and `packages/application/test`. API/integration coverage lives in `apps/api/test`. `pnpm test:e2e` runs the API HTTP E2E suite through the API workspace script.

## Structure

- `packages/domain/test`: value objects and financial entities.
- `packages/application/test`: financial use cases, ports, repositories in memory, log spies, and state preservation checks.
- `apps/api/test`: API integration tests and HTTP E2E tests.
- `packages/testing`: shared builders, fixtures, and mocks as the suite grows.

## API HTTP E2E Suite

The API E2E suite is organized by resource and runs with `pnpm test:e2e`.
`apps/api/test/financial-api.e2e.test.ts` remains the smoke test for the full
financial cycle. New coverage is split into focused files:

- `players.e2e.test.ts`;
- `assets.e2e.test.ts`;
- `orders.e2e.test.ts`;
- `portfolio.e2e.test.ts`;
- `income-transactions.e2e.test.ts`;
- `game-loop-education.e2e.test.ts`.

Shared helpers live in `apps/api/test/test-http.ts`. E2E tests start an
in-process NestJS application on a random local port, use only mock/in-memory
providers, avoid brapi and real databases, and validate predictable errors by
HTTP status, `error.code`, and `correlationId` when present.

## API E2E por recurso

A API possui testes E2E HTTP por recurso:

- `financial-api.e2e.test.ts`: smoke test do ciclo financeiro completo.
- `players.e2e.test.ts`: criação, consulta, carteira inicial e validações de jogador.
- `assets.e2e.test.ts`: catálogo de ativos, preço, histórico e refresh mockado.
- `orders.e2e.test.ts`: compra, venda e erros financeiros previsíveis.
- `portfolio.e2e.test.ts`: carteira, portfólio, alocação e resumo.
- `income-transactions.e2e.test.ts`: coleta de rendimentos e histórico.
- `game-loop-education.e2e.test.ts`: Mentor, missões, cidade e estado do game loop.
- `market-data.e2e.test.ts`: endpoints de provider de dados de mercado com dados reais desabilitados.

## Required Financial Scenarios

Every financial use case should include:

- happy path;
- invalid business rule;
- assertion that invalid operations preserve balance;
- assertion that invalid operations preserve position;
- assertion that invalid operations do not append completed transaction history;
- `INFO` log assertion for valid relevant operations;
- `WARN` log assertion for expected business blocks.

Money must remain integer cents. Tests must not use floats as source values.

## Determinism

Tests should inject clocks, repositories, IDs, and market prices. Avoid real time, random prices, production databases, or development databases in automated tests.
