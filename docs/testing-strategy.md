# Testing Strategy

## Commands

```bash
pnpm test
pnpm test:unit
pnpm test:integration
pnpm test:coverage
```

`pnpm test` runs every workspace test. Unit tests currently live in `packages/domain/test` and `packages/application/test`. API/integration coverage lives in `apps/api/test`.

## Structure

- `packages/domain/test`: value objects and financial entities.
- `packages/application/test`: financial use cases, ports, repositories in memory, log spies, and state preservation checks.
- `apps/api/test`: API integration tests.
- `packages/testing`: shared builders, fixtures, and mocks as the suite grows.

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
