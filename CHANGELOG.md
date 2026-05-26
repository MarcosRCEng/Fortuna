# Changelog

All notable project changes are tracked here. Fortuna uses planned semantic
versioning while the product is still pre-1.0.

## [0.2.0] - Playable MVP

Integration branch: `integration/mvp-sprints-14-23`

Source branch: `codex/gameplay-loop-base`

Suggested previous baseline tag: `v0.1.0-bootstrap`

### Added

- Playable financial education loop across API and web app.
- Prisma/PostgreSQL persistence with environment-selectable adapters.
- MVP financial API for players, assets, wallet, portfolio, orders, income,
  transactions, missions, Mentor Fortuna, city state, and mock market refresh.
- Cidade Fortuna progression, educational missions, mentor feedback, and demo
  seed data.
- Market data architecture prepared for mock, future external providers, cache,
  and fallback.
- Structured logging, correlation id handling, compliance-readiness notes, and
  Bruno API requests.
- Release checklist and release notes for `v0.2.0`.

### Guardrails

- Money remains represented as integer cents as the source of truth.
- Floats are not used as financial truth.
- Negative balances, purchases without sufficient balance, selling above the
  current position, and leverage are blocked.
- The experience remains educational and simulated; no real investment
  integration or financial recommendation is introduced.

### Validation Target

- `corepack pnpm install`
- `corepack pnpm build`
- `corepack pnpm test`
- `corepack pnpm test:coverage`
- `corepack pnpm test:e2e`
- `corepack pnpm prisma:generate`
- Optional PostgreSQL validation with Docker, Prisma migrate, and demo seed.

## [0.1.0] - Bootstrap

Initial monorepo bootstrap with domain foundation, application ports,
infrastructure adapters, API health endpoint, web bootstrap screen,
documentation, tests, and build scripts.
