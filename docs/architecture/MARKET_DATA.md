# Market Data Architecture

Fortuna centraliza dados de mercado no port `MarketDataProvider`, definido em
`packages/application`. A UI e a API devem consumir use cases de aplicacao, e o
dominio financeiro deve conhecer apenas abstracoes como `MarketPriceProvider`,
nunca arrays mockados, arquivos locais ou APIs externas diretamente.

## Regra monetaria

1 moeda Fortuna equivale a R$ 0,01. Precos, rendimentos e valores financeiros
trafegam como centavos inteiros. APIs reais devem ser convertidas para centavos
na borda da aplicacao, antes de qualquer regra financeira.

## MVP mockado

`MockMarketDataProvider`, em `packages/infrastructure`, fornece os ativos
ficticios do MVP:

- `CASH`: Caixa Fortuna.
- `TSF001`: Tesouro Selic Fortuna.
- `CDBLF001`: CDB Liquidez Fortuna.
- `FIISF001`: FII Shopping Fortuna.
- `FIILF001`: FII Logistica Fortuna.
- `AEF001`: Acao Energia Fortuna.
- `ATF001`: Acao Tecnologia Fortuna.

O provider usa seed e data injetaveis para gerar precos e historico de forma
deterministica. A simulacao usa basis points inteiros, limita preco minimo a 1
centavo e separa o calculo de variacao da atualizacao efetiva de precos.

## Contratos e API

Os contratos principais ficam no port `MarketDataProvider`:

- `Asset`: cadastro do ativo, preco atual em centavos, risco, liquidez,
  rendimento esperado, origem do dado e status do preco.
- `AssetPrice`: cotacao atual rastreavel, com preco anterior e variacao em
  basis points apenas como dado derivado.
- `AssetHistoryPoint`: historico simulado ordenado por data, sempre em centavos.
- `ExpectedYield`: expectativa de rendimento em taxa inteira ou valor por cota.
- `EducationalAssetInfo`: conteudo educativo usado pela UI e pelo mentor.

A API expoe os dados por use cases de aplicacao:

- `GET /api/v1/assets`
- `GET /api/v1/assets/:symbol`
- `GET /api/v1/market/quotes/:symbol`
- `GET /api/v1/market/history/:symbol?from=2026-05-01&to=2026-05-21`
- `GET /api/v1/market/yields/:symbol`
- `GET /api/v1/market/status`
- `POST /api/v1/market/refresh`

## Rendimentos

A camada de mercado informa a expectativa de rendimento:

- `CASH`: sem rendimento no MVP.
- `FIXED_INCOME`: taxa esperada em basis points.
- `FII`: valor mensal esperado por cota em centavos.
- `STOCK`: sem rendimento automatico, ou campo educativo para dividendos
  eventuais.

Creditar saldo, registrar historico e validar carteira continuam sendo
responsabilidade do dominio financeiro e dos use cases.

## Preparacao para providers reais

Futuros adapters podem implementar o mesmo contrato:

- `BrapiMarketDataProvider`
- `B3MarketDataProvider`
- `GoogleFinanceMarketDataProvider`
- `MsnMoneyMarketDataProvider`
- `CachedMarketDataProvider`
- `FallbackMarketDataProvider`
- `CompositeMarketDataProvider`

Esses adapters devem preservar a origem do dado em `MarketDataSource`, expor
status de preco (`UPDATED`, `STALE`, `SIMULATED`, `UNAVAILABLE`) e registrar
falhas, cache, fallback e preco defasado em logs estruturados.

## Riscos na migracao

Ao trocar mocks por dados reais, os principais riscos sao preco atrasado,
mercado fechado, finais de semana e feriados, ativos sem liquidez, rate limits,
APIs pagas, indisponibilidade, simbolos diferentes entre provedores, dados
inconsistentes, splits, grupamentos, dividendos reais, arredondamento e uso
indevido de floats vindos de APIs externas.

Cada ordem futura deve conseguir auditar qual preco foi usado, em que horario,
qual provider originou a cotacao e se houve cache ou fallback.

## Plano incremental de evolucao

1. Manter o dominio financeiro dependente apenas de `MarketPriceProvider` e
   manter a UI falando com API/use cases, nunca com providers concretos.
2. Implementar adapters reais na infraestrutura, convertendo qualquer valor
   monetario externo para centavos inteiros na borda.
3. Adicionar cache com TTL por classe de ativo e marcar respostas como `CACHE`
   ou `STALE` quando necessario.
4. Introduzir fallback controlado para mock/cache em desenvolvimento ou falha
   do provedor, preservando logs estruturados.
5. Registrar na ordem o preco usado, horario, status e origem para auditoria
   financeira.
