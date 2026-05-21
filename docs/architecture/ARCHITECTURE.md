# Fortuna Architecture

Fortuna uses a simplified Clean Architecture approach inside a TypeScript monorepo. The goal is to keep financial rules reliable while allowing the gamified experience to evolve independently.

## Layers

- `packages/domain`: owns financial entities, value objects, and invariants. Money is represented as integer cents and must not use floats as a source of truth.
- `packages/application`: owns use cases and ports. Use cases orchestrate domain operations and infrastructure contracts, but do not depend directly on HTTP, databases, or external market providers.
- `packages/infrastructure`: owns adapters such as market data providers, structured logging, and future persistence implementations.
- `apps/api`: exposes HTTP endpoints through NestJS and maps API requests to application use cases.
- `apps/web`: owns UI and client-side interactions. It must not contain critical financial rules.

## Money Rule

1 Fortuna coin equals R$ 0.01. All money is stored and computed as integer cents. Negative money is not allowed in the MVP unless a future explicit domain decision introduces a justified concept.

## Market Data

The application depends on a `MarketDataProvider` port. The MVP uses mocked market data returning prices in integer cents. Real integrations such as Brapi, B3 for Developers, MSN Money, Google Finance, or equivalents can be added later as infrastructure adapters.

## MVP Data Strategy

Mocked market data keeps the MVP deterministic and testable. Real provider concerns such as rate limits, credentials, retries, and stale quotes are intentionally outside the bootstrap scope.

## UI Boundary

The UI presents information and collects user intent. Critical financial decisions, validations, balances, positions, and order rules belong in the domain and application layers.
