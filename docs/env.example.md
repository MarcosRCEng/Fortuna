# Variaveis de Ambiente

## Market Data

Padrao seguro para o MVP:

```env
MARKET_DATA_PROVIDER=mock
MARKET_DATA_ALLOW_REAL_DATA=false
BRAPI_BASE_URL=https://brapi.dev/api
BRAPI_API_TOKEN=
BRAPI_TIMEOUT_MS=5000
BRAPI_CACHE_TTL_SECONDS=900
BRAPI_MAX_SYMBOLS_PER_REQUEST=1
MARKET_DATA_ALLOWED_SYMBOLS=PETR4,VALE3,ITUB4,MGLU3
```

Para usar brapi em desenvolvimento, configure `MARKET_DATA_PROVIDER=brapi`, `MARKET_DATA_ALLOW_REAL_DATA=true` e informe `BRAPI_API_TOKEN` em um arquivo local nao versionado. O token nunca deve aparecer em logs, respostas HTTP, testes gravados ou documentacao publica.

Mesmo com brapi habilitada, o Fortuna continua sendo uma simulacao educativa: carteira, compra, venda, rendimento, missoes e mentor nao executam operacoes reais e nao fazem recomendacao financeira.
