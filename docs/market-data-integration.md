# Politica inicial de dados de mercado

O Fortuna usa dados de mercado apenas para fins educativos. A carteira do jogador continua simulada, nao ha investimento real e nenhuma tela deve sugerir compra ou venda de ativos.

## Cache obrigatorio

Toda consulta real passa pelo `CachedMarketDataProvider` antes de chegar a brapi. O TTL e configurado por `BRAPI_CACHE_TTL_SECONDS` e o minimo operacional do MVP e 900 segundos, ou 15 minutos. Valores menores sao elevados internamente para 900 segundos e geram warning de configuracao.

Chamadas repetidas para o mesmo conjunto de tickers normalizados dentro do TTL retornam `source=cache` e nao disparam nova chamada externa.

## Sem polling agressivo

O MVP nao implementa polling automatico de cotacoes reais no front-end e nao cria cron/job de atualizacao continua. O refresh mockado existente permanece manual e nao deve acionar provider real sem `MARKET_DATA_ALLOW_REAL_DATA=true`.

Atualizacoes de mercado acontecem somente por:

- botao manual da UI;
- chamada explicita de endpoint;
- refresh controlado que respeita TTL;
- inicializacao de tela usando cache quando ainda valido.

## Endpoint de refresh controlado

`POST /market/refresh` executa refresh manual e retorna metadados de origem:

```json
{
  "provider": "brapi",
  "source": "cache",
  "symbols": ["PETR4"],
  "refreshedAt": "2026-05-27T00:00:00.000Z",
  "cacheTtlSeconds": 900,
  "fallbackUsed": false
}
```

O endpoint respeita feature flag, allowlist, limite de simbolos e cache. Ele nao forca chamada externa quando o TTL ainda esta valido.

## Feature flag

`MARKET_DATA_ALLOW_REAL_DATA=false` e o padrao. Nesse modo a aplicacao usa `MockMarketDataProvider`, nao chama brapi e retorna origem simulada.

Para habilitar dados reais localmente, configure `MARKET_DATA_PROVIDER=brapi`, `MARKET_DATA_ALLOW_REAL_DATA=true` e `BRAPI_API_TOKEN`.

## Allowlist e limites

`MARKET_DATA_ALLOWED_SYMBOLS` define os tickers autorizados para consulta real. Os simbolos sao normalizados para uppercase, espacos sao removidos e duplicados sao descartados. Simbolos fora da allowlist geram erro de negocio e nao sao enviados para a API externa.

`BRAPI_MAX_SYMBOLS_PER_REQUEST=1` mantem o MVP conservador. Requests com simbolos acima do limite sao rejeitados antes de chamar brapi.

## Timeout e fallback

Toda chamada externa usa `BRAPI_TIMEOUT_MS`. Timeout, HTTP 401, 403, 429, 500, indisponibilidade, resposta vazia ou payload invalido acionam fallback para dados simulados quando a experiencia do jogador puder continuar.

A resposta informa `fallbackUsed=true` e a mensagem neutra:

```txt
Dados reais indisponiveis no momento. Exibindo dados simulados para fins educativos.
```

Logs estruturados registram tentativa real, cache hit, cache miss, fallback, motivo tecnico, provider, simbolos, duracao e status HTTP quando houver. `BRAPI_API_TOKEN` e headers sensiveis nunca devem ser logados.

## Exemplo de .env.local

```env
MARKET_DATA_PROVIDER=brapi
MARKET_DATA_ALLOW_REAL_DATA=false
BRAPI_BASE_URL=https://brapi.dev/api
BRAPI_API_TOKEN=replace_me
BRAPI_TIMEOUT_MS=5000
BRAPI_CACHE_TTL_SECONDS=900
BRAPI_MAX_SYMBOLS_PER_REQUEST=1
MARKET_DATA_ALLOWED_SYMBOLS=PETR4,VALE3,ITUB4,MGLU3
```

## Limites do MVP

- Dados reais podem ter atraso ou ficar indisponiveis.
- A plataforma nao recomenda investimento.
- Precos monetarios sao convertidos para centavos inteiros na borda do provider.
- Percentuais podem permanecer como `number`.
- Proventos reais nao sao aplicados automaticamente.
- Novos providers devem implementar `MarketDataProvider` sem vazar payload bruto para o dominio.
