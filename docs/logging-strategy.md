# Logging Strategy

Fortuna uses the application `LoggerPort` and the infrastructure `PinoLogger` adapter for structured logs.

## Levels

- `DEBUG`: calculation internals, mocked market details, mission evaluation, game loop diagnostics.
- `INFO`: expected successful events such as asset purchase, asset sale, income collection, mission completion, and market cycle changes.
- `WARN`: expected business rule blocks such as insufficient balance, insufficient position, already collected income, missing player, missing asset, or invalid operation.
- `ERROR`: unexpected technical failures such as repository, database, serialization, or internal integration failures.

Business rule violations should not be logged as `ERROR` unless a technical failure is also involved.

## Payload Standard

Use:

- `module`: bounded context, for example `financial_operation`, `income`, `market`, `mission`, or `repository`;
- `action`: stable event name, for example `asset_purchase_completed`;
- `correlationId`: when available;
- `context`: audit data using integer cents for money.

## Required Events

- `asset_purchase_completed` as `INFO`.
- `asset_purchase_blocked_insufficient_balance` as `WARN`.
- `asset_sale_completed` as `INFO`.
- `asset_sale_blocked_insufficient_position` as `WARN`.
- `income_collected` as `INFO`.
- `income_collection_blocked_already_collected` as `WARN`.
- repository persistence failures as `ERROR`.

## Example

```json
{
  "module": "financial_operation",
  "action": "asset_purchase_completed",
  "correlationId": "request-123",
  "context": {
    "playerId": "player-123",
    "assetId": "asset-001",
    "operationId": "op-001",
    "quantity": 5,
    "unitPriceCents": 1000,
    "totalAmountCents": 5000,
    "balanceAfterCents": 15000
  }
}
```
