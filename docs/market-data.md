# Market Data do MVP

## Objetivo

A camada de Market Data enriquece a simulacao financeira do Fortuna com variacao de mercado. Ela nao transforma o produto em plataforma de trading, nao executa ordens reais, nao recomenda compra ou venda e nao acompanha mercado em tempo real agressivo.

Dados de mercado usados apenas para fins educativos e de simulacao. Nao constituem recomendacao de investimento.

## Escopo do MVP

- Provider principal preparado: `brapi.dev`.
- Provider seguro/fallback: `mock`.
- Cache obrigatorio para cotacoes e historico.
- TTL minimo: 900 segundos.
- Dados reais somente quando `MARKET_DATA_PROVIDER=brapi`, `MARKET_DATA_ALLOW_REAL_DATA=true` e `BRAPI_API_TOKEN` estiver configurado.
- Fallback para mock em erro, timeout, token ausente, bloqueio, rate limit, resposta invalida ou indisponibilidade.
- Allowlist pequena de ativos.
- Sem websocket, intraday, polling agressivo, carteira real, corretora ou recomendacao financeira.

## Variaveis de Ambiente

```env
MARKET_DATA_PROVIDER=brapi
BRAPI_BASE_URL=https://brapi.dev/api
BRAPI_API_TOKEN=
BRAPI_TIMEOUT_MS=5000
BRAPI_CACHE_TTL_SECONDS=900
BRAPI_MAX_SYMBOLS_PER_REQUEST=1
MARKET_DATA_ALLOW_REAL_DATA=false
MARKET_DATA_ALLOWED_SYMBOLS=PETR4,VALE3,ITUB4,MGLU3
```

`BRAPI_API_TOKEN` nunca deve ser versionado ou exposto por endpoint/log.

## Allowlist

```json
[
  {
    "symbol": "PETR4",
    "name": "Petrobras PN",
    "assetType": "stock",
    "currency": "BRL"
  },
  {
    "symbol": "VALE3",
    "name": "Vale ON",
    "assetType": "stock",
    "currency": "BRL"
  },
  {
    "symbol": "ITUB4",
    "name": "Itau Unibanco PN",
    "assetType": "stock",
    "currency": "BRL"
  },
  {
    "symbol": "MGLU3",
    "name": "Magazine Luiza ON",
    "assetType": "stock",
    "currency": "BRL"
  }
]
```

## Endpoints Disponiveis

### `GET /market/assets`

Retorna a allowlist local do MVP.

```json
{
  "data": [
    {
      "symbol": "PETR4",
      "name": "Petrobras PN",
      "assetType": "stock",
      "currency": "BRL"
    }
  ]
}
```

### `GET /market/quotes?symbols=PETR4,VALE3`

Retorna cotacoes atuais para simbolos permitidos. `symbols` e obrigatorio, separado por virgula, normalizado para uppercase e limitado por `BRAPI_MAX_SYMBOLS_PER_REQUEST`.

```json
{
  "data": [
    {
      "symbol": "PETR4",
      "name": "Petrobras PN",
      "assetType": "stock",
      "currency": "BRL",
      "priceInCents": 3842,
      "regularMarketChangePercent": 1.25,
      "regularMarketChangeInCents": 47,
      "regularMarketPreviousCloseInCents": 3795,
      "marketTime": "2026-05-28T18:00:00.000Z",
      "provider": "mock",
      "isRealData": false,
      "isDelayed": false
    }
  ],
  "meta": {
    "cacheTtlSeconds": 900,
    "realDataEnabled": false
  }
}
```

### `GET /market/assets/:symbol/history?range=1mo&interval=1d`

Retorna historico minimo. O contrato arquitetural aceita `1d`, `5d`, `1mo`, `3mo`, `6mo`, `1y`, `5y` e `max`, com intervalos `1d`, `1wk` e `1mo`. O endpoint MVP atual permanece mais conservador quando necessario para preservar a experiencia jogavel.

```json
{
  "data": [
    {
      "symbol": "PETR4",
      "date": "2026-05-01",
      "openInCents": 3700,
      "highInCents": 3850,
      "lowInCents": 3650,
      "closeInCents": 3820,
      "volume": 12345600,
      "provider": "mock",
      "isRealData": false
    }
  ],
  "meta": {
    "symbol": "PETR4",
    "range": "1mo",
    "interval": "1d",
    "cacheTtlSeconds": 900,
    "realDataEnabled": false
  }
}
```

### `GET /market/status`

Alias: `GET /market/provider/status`.

```json
{
  "data": {
    "provider": "brapi",
    "realDataEnabled": false,
    "hasBrapiToken": false,
    "cacheTtlSeconds": 900,
    "allowedSymbols": ["PETR4", "VALE3", "ITUB4", "MGLU3"],
    "lastSuccessfulFetchAt": null,
    "status": "mock_only"
  }
}
```

`status` pode ser:

- `mock_only`: dados reais desabilitados ou token ausente.
- `ok`: dados reais habilitados, token presente e ultima consulta bem-sucedida.
- `degraded`: dados reais habilitados, mas houve falha recente e fallback/cache/mock esta mantendo a experiencia.

## Cache

Cotacoes e historico sempre passam por cache em memoria. A chave considera provider, simbolos normalizados, simbolo, range e interval. Quando a resposta vem do cache, os itens retornam `provider="cache"` e preservam `isRealData` do dado original.

## Fallback

O fallback para mock cobre:

- `MARKET_DATA_ALLOW_REAL_DATA=false`;
- token ausente;
- timeout;
- erro de rede;
- HTTP 401, 403, 429 ou 5xx;
- resposta vazia ou invalida da brapi.

O fallback retorna dados deterministico-educativos com `provider="mock"` e `isRealData=false`, preservando o funcionamento do jogo mesmo sem internet ou provedor externo.

## Arquitetura

A descricao completa do contrato `MarketDataProvider`, decorators de cache/fallback/auditoria e limites de simulacao esta em [market-data-architecture.md](./market-data-architecture.md).
