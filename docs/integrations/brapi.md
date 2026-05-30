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
```

Também podem existir variáveis relacionadas ao provider geral:

```env
MARKET_DATA_PROVIDER=brapi
MARKET_DATA_ALLOW_REAL_DATA=false
BRAPI_MAX_SYMBOLS_PER_REQUEST=1
```

## Endpoint usado

Endpoint principal:

```txt
GET /api/quote/{tickers}
```

Exemplo conceitual:

```txt
GET https://brapi.dev/api/quote/PETR4
```

## Parâmetros usados

Parâmetros previstos:

- `range`;
- `interval`.

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
```

Nao exponha `BRAPI_API_TOKEN` no frontend e nao grave esse token em `localStorage`. O modelo `UserBrapiCredential` existe para uma sprint futura com token por usuario criptografado no backend.
