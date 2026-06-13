# Cache e Fallback de Dados de Mercado

## Objetivo

Definir a política mínima de cache e fallback para consumo de dados reais de mercado no Fortuna.

A integração com dados reais deve ser resiliente, econômica e segura para o MVP.

## Política inicial

Para proteger o MVP contra consumo excessivo:

- Cache obrigatório.
- Nada de polling agressivo.
- Atualização manual por botão ou refresh controlado.
- TTL mínimo recomendado: 15 minutos.
- Lista pequena de ativos permitidos no MVP.
- Fallback para mock em caso de erro, timeout, 401, 403, 429 ou indisponibilidade.

## TTL recomendado

O TTL inicial recomendado é:

```txt
15 minutos
```

Representação sugerida em variável de ambiente:

```env
BRAPI_CACHE_TTL_SECONDS=900
```

## Estratégia de fallback

Fluxo esperado:

```txt
1. Tentar buscar dado real no provider configurado.
2. Se sucesso, salvar/atualizar cache.
3. Se falhar, tentar retornar último dado em cache.
4. Se não houver cache, retornar dado mockado.
5. Marcar corretamente a origem do dado retornado.
```

## Origem dos dados

As respostas devem deixar claro se os dados são:

- reais;
- mockados;
- vindos de cache;
- atrasados;
- indisponíveis.

## Erros que devem acionar fallback

- timeout;
- erro de rede;
- token ausente;
- erro 401;
- erro 403;
- erro 429;
- erro 5xx;
- resposta inválida;
- provider indisponível.

## Restrições

- Não fazer polling agressivo.
- Não chamar provider externo em loop descontrolado.
- Não depender exclusivamente de dados reais para o jogo funcionar.
- Não bloquear compra/venda simulada apenas porque a API externa falhou, salvo regra de negócio específica futura.

## Catalogo gratuito brapi

O catalogo listado usa configuracao de cache propria:

```env
MARKET_CATALOG_CACHE_TTL_SECONDS=900
MARKET_CATALOG_MAX_PAGE_SIZE=50
MARKET_CATALOG_PROVIDER_CONCURRENCY=3
```

`BRAPI_CACHE_TTL_SECONDS` cobre cotacoes individuais e historico. O catalogo
listado usa `MARKET_CATALOG_CACHE_TTL_SECONDS`, para permitir ajuste separado
do endpoint amplo `GET /api/quote/list`.

## Chave de cache do catalogo

A chave do catalogo e normalizada e versionada. Ela considera:

- texto de pesquisa normalizado;
- tipos canonicos ordenados;
- setores ordenados;
- ordenacao canonica;
- pagina;
- tamanho da pagina;
- versao do contrato.

Filtros equivalentes em ordens diferentes devem gerar a mesma chave. O token da
brapi nunca entra na chave. Chaves de catalogo usam prefixo proprio e nao se
misturam com chaves de cotacoes individuais.

Para catalogo, cache expirado pode ser usado como stale fallback quando a brapi
falhar temporariamente. A origem da resposta deve ser `CACHE` nesse caso. Sem
cache disponivel, o endpoint retorna `MOCK`.
