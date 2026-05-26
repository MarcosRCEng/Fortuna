# API Database Boundary

The API should call application use cases or infrastructure adapters. It must
not manipulate Prisma models directly for financial operations.

PostgreSQL and Prisma live in `packages/infrastructure/prisma`. Financial writes
that touch balance, positions and history should go through
`PrismaFinancialOperationsService` or an application use case with equivalent
transactional guarantees.
