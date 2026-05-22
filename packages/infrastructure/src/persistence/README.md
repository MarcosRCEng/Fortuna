# Fortuna Persistence

Fortuna uses PostgreSQL with Prisma in the infrastructure layer. Domain and
application packages still depend only on ports and domain objects.

## Database Model

- `players`: player identity and status. Primary key `id`; audit fields
  `created_at` and `updated_at`.
- `wallets`: one simulated financial wallet per player. `available_balance_cents`
  is `BIGINT` and has a non-negative check constraint.
- `assets`: tradable game assets. Symbols are unique and uppercase. Prices are
  not stored as current truth in this table.
- `market_prices`: historical/mock prices in integer cents, indexed by
  `asset_id` and `reference_datetime`.
- `positions`: current player position per asset. Unique key
  `player_id + asset_id`; quantity and invested values cannot be negative.
- `transactions`: append-only financial history for buys, sells, income
  collection, initial deposits and controlled adjustments. Repositories expose
  insert/read only; no normal delete or financial update method exists.
- `income_events`: available or collected income. `transaction_id` is unique so
  a collected income can be linked to only one transaction.
- `missions` and `player_missions`: educational mission catalog and player
  progress.
- `city_state`: player city progression state. Business rules belong in
  application/domain services, not repository methods.
- `mentor_tips_history`: tips shown by Mentor Fortuna, with optional references
  to assets or game events.
- `game_events`: relevant game events for audit, analytics, mentor context and
  future replay.

All monetary fields use integer cents (`BIGINT`). The mapper checks that values
fit in JavaScript safe integers before creating domain `MoneyCents` objects.

## Migrations And Seeds

Schema migration:

```bash
corepack pnpm --filter @fortuna/infrastructure db:migrate
```

Generate Prisma client:

```bash
corepack pnpm --filter @fortuna/infrastructure db:generate
```

Seed MVP catalog:

```bash
corepack pnpm --filter @fortuna/infrastructure db:seed
```

The seed creates:

- `FORT3`, a mock stock.
- `MALL11`, a mock FII.
- `TESOURO-SELIC`, a mock fixed-income asset.
- Initial market prices for each asset.
- Missions for first buy, diversification, income collection, liquidity reserve
  and Mentor Fortuna tip reading.

## Atomic Financial Operations

`PrismaFinancialOperationsService` is the database-backed orchestration point
for financial writes:

- player creation creates `player`, `wallet`, `city_state`,
  `INITIAL_DEPOSIT` transaction and `PLAYER_CREATED` game event in one
  transaction;
- buy locks the wallet row, checks balance, reads the latest price, updates the
  position, inserts a `BUY` transaction and inserts a game event before commit;
- sell locks wallet and position rows, checks quantity, credits balance,
  updates/removes the current position, inserts a `SELL` transaction and inserts
  a game event before commit;
- income collection locks wallet and income rows, prevents duplicate collection,
  credits balance, marks the income as collected, inserts
  `INCOME_COLLECTED` and inserts a game event before commit.

Repositories remain persistence adapters. They do not decide whether a buy or
sell is allowed.

## Integration Tests

The PostgreSQL integration suite is opt-in to avoid accidental writes to local
development databases:

```bash
$env:FORTUNA_TEST_DATABASE_URL="postgresql://user:pass@localhost:5432/fortuna_test"
corepack pnpm --filter @fortuna/infrastructure test
```

When the variable is absent, the integration tests are skipped and unit tests
continue to run.

## Consistency Risks

- Updating `wallets.available_balance_cents` outside the financial service can
  bypass transaction history. Keep writes behind application use cases.
- Updating `positions` directly can make current holdings diverge from
  `transactions`. Repositories should be used by orchestration code only.
- Duplicate income collection is prevented by row locking, status validation and
  unique `income_events.transaction_id`.
- Concurrent buys and sells lock wallet and position rows with `FOR UPDATE`.
  This avoids basic overspending or overselling in PostgreSQL.
- Latest market price is read inside the same database transaction. If a future
  provider pushes prices during trading, the use case should capture the chosen
  price row/id in transaction metadata.
- Prisma and database schema use integer cents. Do not introduce float, decimal
  or JavaScript fractional number values as money inputs.
- Financial transactions are append-only in normal application flow. Technical
  corrections must be explicit and audited outside regular gameplay.
- Domain objects and application ports must remain database-agnostic.
