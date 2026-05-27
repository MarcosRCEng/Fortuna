# Integracao brapi.dev

## Decisao

A brapi.dev e o provider principal aprovado para a primeira etapa de dados reais do MVP Fortuna. Ela cobre cotacoes de ativos brasileiros, variacao percentual, preco atual, historico OHLCV, acoes, FIIs, ETFs, BDRs e indices por uma API REST simples com Bearer token.

O Fortuna continua sendo educativo e simulado. Dados reais da brapi devem ser tratados como informacao de contexto, nunca como recomendacao de compra ou venda.

## Endpoint usado

```txt
GET https://brapi.dev/api/quote/{tickers}
Authorization: Bearer <token>
```

Recursos usados ou preparados:

- tickers separados por virgula, por exemplo `PETR4,VALE3`;
- historico com `range` e `interval`;
- dividendos por `dividends=true` em etapa futura;
- modulos adicionais por `modules` em etapa futura;
- resposta mapeada para DTO interno do Fortuna, sem expor o payload bruto da brapi.

## Variaveis de ambiente

```env
MARKET_DATA_PROVIDER=mock
BRAPI_BASE_URL=https://brapi.dev/api
BRAPI_API_TOKEN=
BRAPI_TIMEOUT_MS=5000
BRAPI_CACHE_TTL_SECONDS=900
BRAPI_MAX_SYMBOLS_PER_REQUEST=1
MARKET_DATA_ALLOW_REAL_DATA=false
```

`MARKET_DATA_PROVIDER=mock` e o padrao seguro. Use `MARKET_DATA_PROVIDER=brapi` apenas junto com `MARKET_DATA_ALLOW_REAL_DATA=true` e um `BRAPI_API_TOKEN` local. `BRAPI_API_TOKEN` nunca deve ser commitado.

## Rodar local com mock

```bash
MARKET_DATA_PROVIDER=mock
corepack pnpm dev:api
```

Esse modo preserva o comportamento jogavel do MVP com precos simulados e deterministiscos.

## Rodar local com brapi

```bash
MARKET_DATA_PROVIDER=brapi
MARKET_DATA_ALLOW_REAL_DATA=true
BRAPI_API_TOKEN=<token-local>
BRAPI_TIMEOUT_MS=5000
corepack pnpm dev:api
```

Sem `MARKET_DATA_ALLOW_REAL_DATA=true` e sem `BRAPI_API_TOKEN`, a aplicacao deve permanecer no mock provider.

## Token

Crie o token na brapi.dev e configure apenas no `.env` local, secret manager ou ambiente de deploy. Nao registre token em logs, responses, screenshots, documentacao, fixtures ou commits. Se um token aparecer em texto, issue, commit, prompt ou documentacao, trate-o como comprometido e rotacione/revogue imediatamente.

## Cache e fallback

A factory resolve:

- `MARKET_DATA_PROVIDER=mock` para `MockMarketDataProvider`;
- `MARKET_DATA_PROVIDER=brapi` com `MARKET_DATA_ALLOW_REAL_DATA=true` e `BRAPI_API_TOKEN` para `BrapiMarketDataProvider` com fallback para mock;
- cache em memoria via `BRAPI_CACHE_TTL_SECONDS`.

Os retornos normalizados carregam metadados como `source`, `isRealData`, `isCached` e `isFallback`. Fallback nao deve ser apresentado como cotacao real atual sem esses metadados.

## Auditoria e logs

Eventos relevantes:

- `MARKET_DATA_REAL_PROVIDER_SELECTED`;
- `MARKET_DATA_QUOTE_FETCHED`;
- `MARKET_DATA_PROVIDER_FAILED`;
- `MARKET_DATA_FALLBACK_USED`;
- `MARKET_DATA_CACHE_USED`.

Logs devem conter provider, tickers, status e contagens. Nunca incluir token, header `Authorization` ou payload bruto excessivo.

## Limites do MVP

- Uso educativo.
- Dados podem ter atraso.
- Nao e recomendacao de compra ou venda.
- Carteira continua simulada.
- Nao ha investimento real.
- Proventos reais nao sao aplicados automaticamente.
- Valores financeiros internos continuam em centavos inteiros; numeros decimais externos sao convertidos na borda do provider.

## Rate limit e falhas

O provider trata HTTP error, timeout, resposta vazia, ativo nao encontrado, rate limit e ausencia de token. Em falha da brapi, o fluxo principal do MVP deve continuar com fallback mockado ou cacheado conforme configuracao.

## Proximos passos

- Ligar endpoints da API aos novos DTOs normalizados quando a exposicao de dados reais for aprovada.
- Persistir auditoria de consultas reais.
- Conectar consentimento real de usuario antes de qualquer experiencia personalizada com dados reais.
- Definir politica de stale data e exibicao de atraso na UI.
- Avaliar rate limits por ambiente e monitoramento operacional.
