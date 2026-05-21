# ADR-001: Arquitetura Base

## Status

Accepted

## Context

Fortuna precisa combinar uma experiencia gamificada com uma base financeira confiavel. O MVP usara dados mockados, mas deve estar preparado para evoluir para provedores reais e persistencia robusta.

## Decision

Adotaremos:

- Clean Architecture simplificada.
- Monorepo TypeScript com pnpm workspaces.
- Dominio financeiro isolado em `packages/domain`.
- REST API no MVP com NestJS.
- Logs estruturados com Pino.
- Swagger/OpenAPI desde o inicio.
- Portas para provedores externos, incluindo `MarketDataProvider`.

## Consequences

As regras financeiras ficam testaveis e isoladas. A API, a UI, o banco e os provedores externos podem evoluir como adaptadores sem contaminar o dominio.
