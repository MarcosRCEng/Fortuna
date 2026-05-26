# Game Loop do MVP

## Visao geral

A Sprint 17 conecta o nucleo financeiro ao loop jogavel minimo do Fortuna. O jogador consulta um estado consolidado, compra e vende ativos simulados, coleta rendimentos, conclui missoes, recebe feedback educativo do Mentor Fortuna, progride e ve a Cidade Fortuna evoluir.

O orquestrador central e `GameLoopService`, em `packages/application/src/gameplay`. Ele recebe eventos financeiros e snapshots de carteira, avalia marcos de gameplay, missoes, progresso, desbloqueios, cidade e feedback do mentor. Controllers continuam finos: recebem a requisicao, chamam `PlayerApiService` e devolvem DTOs.

## Eventos internos

O MVP usa eventos internos em memoria, sem broker externo. Eventos financeiros saem dos use cases como `AssetBought`, `AssetSold` e `IncomeCollected`/`YieldCollected`; `DomainEventPublisher` os converte para eventos de aplicacao auditaveis com `id`, `type`, `playerId`, `occurredAt`, `correlationId`, `causationId` e `payload`.

Eventos de gameplay gerados pelo loop incluem:

- `ASSET_PURCHASED`
- `ASSET_SOLD`
- `INCOME_COLLECTED`
- `MISSION_COMPLETED`
- `PLAYER_LEVEL_UP`
- `MARKET_PRICES_REFRESHED`
- marcos como `FIRST_BUY`, `FIRST_SELL`, `FIRST_INCOME_RECEIVED` e `FIRST_DIVERSIFICATION`

Todos os valores financeiros permanecem em centavos inteiros.

## Fluxo de compra

`POST /players/:playerId/orders/buy` valida ativo, quantidade, preco atual e saldo disponivel. A compra debita a wallet, cria ou atualiza posicao, registra transacao, emite `AssetBought` e aciona o game loop com snapshot atualizado da carteira.

Uma compra pode completar missoes como primeira compra, primeiro FII, primeira renda fixa, diversificacao e saldo de seguranca.

## Fluxo de venda

`POST /players/:playerId/orders/sell` valida ativo, quantidade e posicao suficiente. A venda reduz a posicao, credita saldo, registra transacao, emite `AssetSold` e aciona o game loop.

O Mentor Fortuna gera orientacao educativa para venda, reforcando risco, liquidez, diversificacao e que resultado passado nao promete ganho futuro.

## Coleta de rendimento

`POST /players/:playerId/income/collect` localiza rendimento disponivel, credita a wallet, marca o rendimento como coletado, registra transacao, emite evento de coleta e aciona o loop.

A coleta pode concluir a missao de primeiro rendimento e evoluir sinais visuais da Cidade Fortuna, como o distrito de renda passiva.

## Mercado mockado

`POST /market/refresh-mock-prices` atualiza precos simulados em centavos e retorna variacao em basis points. O refresh registra evento `MARKET_PRICES_REFRESHED` no loop, mas nao altera saldo do jogador e nao realiza ganho ou prejuizo sem venda.

`POST /players/:playerId/game-loop/tick` executa um tick controlado: atualiza precos mockados, recalcula carteira, avalia progresso/cidade e retorna o estado consolidado.

## Estado consolidado

`GET /players/:playerId/game-loop/state` retorna:

- jogador, nivel e progresso;
- saldo disponivel formatado e em centavos;
- patrimonio e alocacao em basis points;
- rendimentos coletaveis;
- missoes ativas e concluidas recentemente;
- mensagens recentes do mentor;
- estado minimo da cidade;
- historico auditavel combinado de transacoes e eventos de gameplay.

## Missoes

`MissionEvaluator` avalia o catalogo MVP a partir dos eventos e do snapshot de carteira. Missoes completadas sao gravadas no progresso do jogador por `MISSION_COMPLETED` e nao sao duplicadas.

## Mentor

O Mentor Fortuna e baseado em regras. Ele nao usa IA generativa no MVP, nao promete ganhos e nao recomenda ativo como garantia de retorno. As mensagens sao educativas e contextualizam risco, liquidez, diversificacao, rendimento e comportamento.

## Progressao e cidade

`ProgressionService` aplica experiencia por evento real e emite `PLAYER_LEVEL_UP` quando ha mudanca de nivel. `CityEvolutionService` deriva nivel da cidade, distritos, predios e sinais visuais a partir do progresso.

Regras atuais:

- primeira compra acende o centro financeiro;
- primeiro rendimento ativa sinais de renda passiva;
- diversificacao desbloqueia estado visual diversificado;
- missoes concluidas aumentam progresso educacional.

## Historico e auditoria

Operacoes financeiras validas sempre geram `Transaction`. O estado consolidado combina transacoes e eventos de gameplay para reconstruir o que aconteceu com o jogador.

Historico minimo coberto:

- compras;
- vendas;
- rendimentos coletados;
- refresh de mercado;
- missoes concluidas;
- progresso;
- cidade;
- mensagens do mentor derivadas dos eventos.

## Decisoes tecnicas

- Dinheiro usa centavos inteiros (`MoneyCents` e campos `*Cents`).
- Percentuais usam basis points.
- O dispatcher interno e rastreavel e executa handlers isoladamente.
- No modo Prisma, as operacoes financeiras criticas continuam transacionais em `PrismaFinancialOperationsService`.
- No modo in-memory, o comportamento do loop e preservado para testes e desenvolvimento local.

## Limitacoes do MVP

- Sem integracao real com mercado financeiro.
- Sem IA generativa para mentor.
- Estado de gameplay da API in-memory e volatil quando a persistencia Prisma nao esta ativada.
- Persistencia duravel de progresso/cidade/historico de gameplay pode ser aprofundada em sprint futura.
