# Arquitetura de Market Data

## Objetivo

O Fortuna consome dados de mercado apenas para enriquecer a simulacao educativa. Mesmo quando uma cotacao vier de fonte real, compra, venda, carteira, rendimento, missoes e mentor continuam 100% simulados. Nao ha ordem real, corretora, custodia, recomendacao de compra ou venda, nem promessa de rentabilidade.

## Contrato estavel

O contrato compartilhado fica em `packages/domain/src/market/MarketData.ts`:

```ts
export interface MarketDataProvider {
  getQuote(symbol: string): Promise<MarketQuote>;
  getQuotes(symbols: string[]): Promise<MarketQuote[]>;
  getHistoricalPrices(
    symbol: string,
    input: HistoricalPriceInput,
  ): Promise<HistoricalPrice[]>;
  getProviderStatus(): Promise<MarketDataProviderStatus>;
}
```

Todos os valores financeiros dos DTOs usam centavos inteiros (`priceInCents`, `closeInCents`, etc.). O retorno sempre informa `provider` (`brapi`, `mock` ou `cache`) e `isRealData`.

## Providers

- `MockMarketDataProvider`: fallback seguro, deterministico, offline, sem token e com `isRealData=false`.
- `BrapiMarketDataProvider`: adapter externo isolado, configuravel por ambiente, converte decimal externo para centavos e nunca deve expor token.
- `CachedMarketDataProvider`: decorator obrigatorio para cotacoes e historico, TTL minimo de 900 segundos, normalizacao de simbolos e retorno `provider="cache"` em hit.
- `FallbackMarketDataProvider`: tenta o primario e usa mock em falha, timeout, rate limit, resposta invalida ou indisponibilidade.
- `AuditedMarketDataProvider`: registra chamadas, sucesso, falha, provider, simbolos, duracao e origem dos dados sem headers, tokens ou payload externo completo.

## Composicao

Fluxo recomendado:

```txt
Controller
-> MarketDataService
-> AuditedMarketDataProvider
-> FallbackMarketDataProvider
-> CachedMarketDataProvider
-> BrapiMarketDataProvider
-> MockMarketDataProvider
```

Quando `MARKET_DATA_PROVIDER=mock` ou `MARKET_DATA_ALLOW_REAL_DATA=false`, o mock e a fonte ativa. Quando `brapi` esta habilitado com token, a brapi passa por cache e fallback para mock.

## Cache

Chaves normalizadas:

```txt
market:quotes:{symbolsOrdenados}
market:history:{symbol}:{range}:{interval}
```

Normalizacao:

- `trim`;
- uppercase;
- remocao de duplicados;
- ordenacao para listas.

O cache preserva `isRealData` do dado original e altera apenas `provider` para `cache`.

## Fallback

Falhas externas nao quebram o fluxo jogavel. A estrategia para multiplas cotacoes e:

- se a chamada primaria falhar como um todo, usar mock para todos;
- se houver retorno parcial, preencher ausentes com mock;
- cada item indica seu proprio `provider`.

## Auditoria

Eventos minimos:

- `MarketQuoteRequested`;
- `MarketQuotesRequested`;
- `HistoricalPricesRequested`;
- `MarketDataProviderFailed`;
- `MarketDataFallbackUsed`;
- `MarketDataCacheHit`;
- `MarketDataCacheMiss`.

Logs nao devem conter `BRAPI_API_TOKEN`, header `Authorization`, cookies, payload externo bruto ou dados pessoais do jogador.

## Variaveis de Ambiente

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

O padrao seguro e `MARKET_DATA_PROVIDER=mock` com `MARKET_DATA_ALLOW_REAL_DATA=false`.

## Limites do MVP

- Sem websocket ou polling agressivo.
- Sem ranking de melhores ativos para comprar.
- Sem sugestao direta do tipo "compre X".
- Sem envio de ordem para ambiente externo.
- Sem integracao com corretora.
- Sem garantia de lucro.

Transacoes simuladas podem registrar metadados de transparencia, como `marketPriceProvider`, `marketPriceIsRealData` e `marketPriceIsDelayed`, mas esses dados nao alteram a natureza simulada da carteira.
