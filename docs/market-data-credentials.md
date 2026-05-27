# Credenciais e configuracao de Market Data

## Provider principal para dados reais

Provider escolhido para o MVP controlado: brapi.dev.

O Fortuna continua sendo um MVP educativo e simulado. Dados reais, quando habilitados explicitamente, servem apenas como contexto de mercado e nao ativam carteira real, ordens reais ou recomendacao financeira.

## Passo a passo

1. Criar conta em brapi.dev.
2. Acessar o dashboard da brapi.
3. Gerar uma chave de API.
4. Criar um arquivo `.env.local` ou `.env.development`.
5. Copiar as variaveis de `.env.example`.
6. Definir `MARKET_DATA_PROVIDER=brapi`.
7. Definir `MARKET_DATA_ALLOW_REAL_DATA=true`.
8. Preencher `BRAPI_API_TOKEN`.
9. Nunca versionar tokens reais.

## Variaveis

- `MARKET_DATA_PROVIDER`: escolhe o provider de market data. Valores aceitos no MVP: `mock` e `brapi`. O padrao seguro e `mock`.
- `BRAPI_BASE_URL`: URL base da API brapi. Padrao: `https://brapi.dev/api`.
- `BRAPI_API_TOKEN`: token local da brapi. Deve ficar vazio em arquivos de exemplo e nunca deve ser commitado.
- `BRAPI_TIMEOUT_MS`: timeout positivo, em milissegundos, para chamadas brapi.
- `BRAPI_CACHE_TTL_SECONDS`: TTL positivo, em segundos, para cache de dados vindos da brapi.
- `BRAPI_MAX_SYMBOLS_PER_REQUEST`: limite positivo de simbolos por requisicao brapi. O MVP usa `1` por padrao.
- `MARKET_DATA_ALLOW_REAL_DATA`: feature flag de consentimento operacional para dados reais. O padrao do MVP e `false`.

## Seguranca

- Nunca commitar token.
- Nunca registrar token em log.
- Nunca registrar header `Authorization` ou valor `Bearer`.
- Rotacionar ou revogar o token caso ele seja exposto em texto, issue, commit, prompt, screenshot, log ou documentacao.
- Manter `MARKET_DATA_ALLOW_REAL_DATA=false` por padrao no MVP.
- Usar mock provider como fallback seguro.

## Fallback

O sistema volta para mock quando:

- dados reais estao desativados;
- token nao existe;
- configuracao esta invalida;
- provider nao e reconhecido.

Logs de fallback devem explicar a causa sem expor segredo.
