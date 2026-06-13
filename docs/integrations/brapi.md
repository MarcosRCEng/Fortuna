# Integração brapi.dev

## Objetivo

Documentar como o Fortuna deve se integrar à brapi.dev para consultar dados de mercado no contexto educativo e simulado do produto.

## Variáveis de ambiente

As variáveis previstas para integração são:

```env
BRAPI_BASE_URL=https://brapi.dev/api
BRAPI_API_TOKEN=
BRAPI_TIMEOUT_MS=5000
BRAPI_CACHE_TTL_SECONDS=900
MARKET_CATALOG_CACHE_TTL_SECONDS=900
MARKET_CATALOG_MAX_PAGE_SIZE=50
MARKET_CATALOG_PROVIDER_CONCURRENCY=3
BRAPI_CAPABILITY_FII_PRO=false
BRAPI_CAPABILITY_TREASURY_PRO=false
```

Também podem existir variáveis relacionadas ao provider geral:

```env
MARKET_DATA_PROVIDER=brapi
MARKET_DATA_ALLOW_REAL_DATA=false
BRAPI_MAX_SYMBOLS_PER_REQUEST=1
```

## Endpoint usado

Endpoints principais:

```txt
GET /api/quote/{tickers}
GET /api/quote/list
```

Exemplo conceitual:

```txt
GET https://brapi.dev/api/quote/PETR4
GET https://brapi.dev/api/quote/list?search=PETR4
```

## Parâmetros usados

Parâmetros previstos:

- `range`;
- `interval`.

Para catalogo listado gratuito, o Fortuna converte filtros canonicos para
parametros permitidos da brapi. Controllers nunca repassam query strings
arbitrarias diretamente. Parametros enviados ao `quote/list`:

- `search`;
- `sortBy`;
- `sortOrder`;
- `limit`;
- `page`;
- `sector`;
- `subType`.

Quando ha um unico tipo canonico, uma consulta externa e feita com o `subType`
correspondente. Quando ha multiplos tipos, o Fortuna consulta cada `subType`
com limite configurado por `MARKET_CATALOG_PROVIDER_CONCURRENCY`, combina os
resultados, remove duplicados por simbolo, aplica ordenacao canonica e pagina a
resposta final.

Parâmetros que devem ficar documentados como uso posterior:

- `dividends`, apenas em sprint posterior;
- `modules`, apenas em sprint posterior.

## Autenticação

Quando houver token configurado, a chamada deve usar:

```txt
Authorization: Bearer <token>
```

O token nunca deve ser versionado no Git.

## Política de fallback

A integração deve respeitar a seguinte política:

- Se token ausente, usar mock.
- Se erro HTTP ou timeout, tentar usar cache.
- Se cache não existir, usar mock.
- Se houver erro 401, 403, 429 ou indisponibilidade, não quebrar a experiência do usuário.
- O usuário deve continuar conseguindo usar o Fortuna em modo simulado.

## Cuidados

- Não usar os dados reais como recomendação de investimento.
- Não prometer rentabilidade.
- Não exibir dados como se fossem tempo real garantido.
- Exibir disclaimer quando dados reais estiverem habilitados.
- Registrar provider, horário da consulta e status da origem dos dados quando aplicável.

# Credenciais brapi no MVP

O token da brapi e uma credencial de integracao, nao uma identidade de usuario. O e-mail autenticado pelo Google identifica o usuario no Fortuna; o token brapi deve ficar somente no backend.

Para o MVP, use um token de aplicacao:

```env
MARKET_DATA_PROVIDER=brapi
MARKET_DATA_ALLOW_REAL_DATA=false
BRAPI_BASE_URL=https://brapi.dev/api
BRAPI_API_TOKEN=
BRAPI_TIMEOUT_MS=5000
BRAPI_CACHE_TTL_SECONDS=900
BRAPI_MAX_SYMBOLS_PER_REQUEST=1
MARKET_CATALOG_CACHE_TTL_SECONDS=900
MARKET_CATALOG_MAX_PAGE_SIZE=50
MARKET_CATALOG_PROVIDER_CONCURRENCY=3
BRAPI_CAPABILITY_FII_PRO=false
BRAPI_CAPABILITY_TREASURY_PRO=false
```

Nao exponha `BRAPI_API_TOKEN` no frontend e nao grave esse token em `localStorage`. O modelo `UserBrapiCredential` existe para uma sprint futura com token por usuario criptografado no backend.

## Mapeamento de tipos do catalogo

O Fortuna usa uma taxonomia canonica interna e nao expoe o payload bruto da brapi. Quando a brapi informar `subType`, o mapeamento deve ser:

- `stock` -> `STOCK`;
- `unit` -> `UNIT`;
- `fii` -> `FII`;
- `etf` -> `ETF`;
- `fi-infra` -> `FI_INFRA`;
- `fi-agro` -> `FI_AGRO`;
- `fip` -> `FIP`;
- `fidc` -> `FIDC`;
- `bdr` -> `BDR`.

Quando `subType` estiver ausente ou desconhecido, a resposta interna usa `UNKNOWN` e registra aviso estruturado sem token, payload bruto ou dados sensiveis. Quando `subType` valido estiver presente, o tipo nao deve ser inferido pelo sufixo do ticker.

## Capacidades do plano gratuito

As capacidades do provider sao configuradas explicitamente, sem tentativa
aleatoria de endpoints Pro:

```ts
{
  listedCatalog: true,
  basicQuotes: true,
  detailedFiiData: false,
  treasury: false,
  analystConsensus: false
}
```

`GET /market/status` expoe essas capacidades sem revelar credenciais. As flags
`BRAPI_CAPABILITY_FII_PRO` e `BRAPI_CAPABILITY_TREASURY_PRO` devem permanecer
`false` no plano gratuito.

## Recursos por plano

| Recurso Fortuna                           | Plano gratuito brapi | Configuracao                          |
| ----------------------------------------- | -------------------- | ------------------------------------- |
| Catalogo listado (`/api/quote/list`)      | Disponivel           | `listedCatalog: true`                 |
| Cotacoes basicas (`/api/quote/{tickers}`) | Disponivel           | `basicQuotes: true`                   |
| Dados detalhados de FII                   | Indisponivel         | `BRAPI_CAPABILITY_FII_PRO=false`      |
| Tesouro real                              | Indisponivel         | `BRAPI_CAPABILITY_TREASURY_PRO=false` |
| Consenso de analistas                     | Fora do escopo       | `analystConsensus: false`             |
