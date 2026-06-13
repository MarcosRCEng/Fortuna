# Contrato de Provider de Dados de Mercado

## Contrato principal

O contrato principal esperado é:

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

## Responsabilidades

O contrato `MarketDataProvider` deve abstrair a origem dos dados de mercado.

Ele deve permitir que a aplicação use diferentes fontes sem acoplar controllers, use cases ou telas diretamente a um provider externo específico.

## Implementações previstas

```txt
MarketDataProvider
├── MockMarketDataProvider
├── BrapiMarketDataProvider
├── CachedMarketDataProvider
├── FallbackMarketDataProvider
└── AuditedMarketDataProvider
```

## Fluxo recomendado

```txt
Controller
→ MarketDataService
→ AuditedMarketDataProvider
→ FallbackMarketDataProvider
→ CachedMarketDataProvider
→ BrapiMarketDataProvider
→ MockMarketDataProvider, se falhar
```

## Regras

- Controllers não devem conhecer diretamente a brapi.
- Use cases não devem depender de HTTP externo diretamente.
- O mock deve continuar disponível.
- Cache e fallback devem ser obrigatórios quando dados reais forem usados.
- Erros externos não devem quebrar o fluxo educativo.
- O provider deve informar se os dados são reais, mockados, atrasados ou vindos de cache.

## Dados esperados

O provider deve trabalhar com estruturas equivalentes a:

- `MarketQuote`;
- `HistoricalPrice`;
- `HistoricalPriceInput`;
- `MarketDataProviderStatus`.

Valores monetários devem ser representados em centavos inteiros sempre que fizer sentido no domínio do Fortuna.

## Catalogo e capacidades

O catalogo de mercado exposto por `/market/catalog` usa formato canonico do
Fortuna (`MarketCatalogPage`) e origem explicita `BRAPI`, `CACHE` ou `MOCK`.
O provider externo nao deve vazar payload bruto para controllers ou telas.

`GET /market/status` tambem deve expor capacidades ativas sem credenciais:

```ts
{
  listedCatalog: true,
  basicQuotes: true,
  detailedFiiData: false,
  treasury: false,
  analystConsensus: false
}
```

No plano gratuito da brapi, capacidades Pro devem ser definidas por
configuracao explicita e permanecer desabilitadas.
