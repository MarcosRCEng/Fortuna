# API Testing

## Swagger/OpenAPI

Run the API:

```bash
pnpm dev:api
```

Swagger is available at:

```text
http://localhost:3000/docs
```

Every public endpoint should document:

- route and HTTP method;
- description;
- params and body;
- success response examples;
- business error response examples;
- proper HTTP status codes.

## Bruno

Manual API checks are versioned in:

```text
api-tests/bruno/fortuna/
```

Use the `Local` environment with:

```text
baseUrl=http://localhost:3000
```

## Error Contract

Business rule violations should follow:

```json
{
  "error": {
    "type": "business_rule_violation",
    "code": "INSUFFICIENT_BALANCE",
    "message": "Saldo insuficiente para realizar a compra.",
    "details": {
      "availableBalanceCents": 20000,
      "requiredAmountCents": 50000
    }
  }
}
```

Technical errors should follow:

```json
{
  "error": {
    "type": "technical_error",
    "code": "INTERNAL_SERVER_ERROR",
    "message": "Erro interno inesperado."
  }
}
```
