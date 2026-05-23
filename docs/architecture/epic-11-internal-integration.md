# Epico 11 - Integracao interna por eventos

## Visao geral

Fortuna integra o dominio financeiro, game loop, missoes, Mentor Fortuna e Cidade Fortuna por eventos de aplicacao. O dominio financeiro continua sendo a fonte de verdade para saldo, posicoes, transacoes e regras monetarias. Depois de uma operacao valida e persistida, o use case publica eventos por um `DomainEventPublisher`, que converte eventos financeiros em envelopes de aplicacao e os entrega ao `EventDispatcher`.

O MVP usa dispatcher em memoria, sincrono e testavel. Handlers nao criticos podem falhar sem desfazer a operacao financeira principal; a falha e registrada em log estruturado. A evolucao natural e substituir o publisher por outbox pos-commit e, depois, por fila/event bus externo sem mudar os contratos dos handlers.

## Fluxos

### Compra

```text
UI
  -> API Controller
    -> BuyAssetUseCase
      -> WalletRepository
      -> AssetRepository/MarketPriceProvider
      -> FinancialDomain
      -> TransactionRepository
      -> DomainEventPublisher
        -> AssetBought
          -> GameLoopEventHandler
          -> MissionEventHandler
          -> MentorEventHandler
          -> CityEventHandler
          -> LogEventHandler
```

Compra valida reduz saldo em centavos, cria/aumenta posicao, cria transacao e publica `AssetBought` e `TransactionCreated`. Compra invalida, sem saldo ou com quantidade invalida, nao publica evento financeiro de sucesso.

### Venda

```text
UI
  -> API Controller
    -> SellAssetUseCase
      -> WalletRepository
      -> PositionRepository
      -> MarketPriceProvider
      -> FinancialDomain
      -> TransactionRepository
      -> DomainEventPublisher
        -> AssetSold
          -> GameLoopEventHandler
          -> MissionEventHandler
          -> MentorEventHandler
          -> CityEventHandler
          -> LogEventHandler
```

Venda valida reduz posicao, aumenta saldo, cria transacao e publica `AssetSold` e `TransactionCreated`. Venda acima da posicao e bloqueada no dominio financeiro.

### Rendimento

```text
GameLoop
  -> GenerateYieldUseCase
    -> WalletRepository
    -> AssetRepository
    -> IncomeEventRepository
    -> DomainEventPublisher
      -> YieldGenerated
        -> MissionEventHandler
        -> MentorEventHandler
        -> CityEventHandler
        -> LogEventHandler

UI
  -> API Controller
    -> CollectIncomeUseCase
      -> IncomeEventRepository
      -> WalletRepository
      -> TransactionRepository
      -> DomainEventPublisher
        -> YieldCollected
          -> GameLoopEventHandler
          -> MissionEventHandler
          -> MentorEventHandler
          -> CityEventHandler
          -> LogEventHandler
```

`GenerateYieldUseCase` cria rendimento pendente em centavos para posicoes existentes. `CollectIncomeUseCase` credita saldo, cria historico e publica `YieldCollected`.

### Avanco de ciclo

```text
UI/Scheduler
  -> AdvanceMarketCycleUseCase
    -> MarketDataProvider
    -> GameLoopService
    -> EventDispatcher
      -> MarketPricesUpdated
      -> CycleAdvanced
        -> GameLoopEventHandler
        -> MissionEventHandler
        -> MentorEventHandler
        -> CityEventHandler
        -> LogEventHandler
```

Atualizacao de preco nao altera saldo nem quantidade de ativos. A variacao afeta apenas valor de mercado e indicadores gamificados.

## Estrategia de eventos

Contratos criados em `packages/application/src/events`:

- `AppEvent`: envelope unico para integracao interna.
- `DomainEvent`: evento vindo do dominio financeiro.
- `ApplicationEvent`: evento de integracao entre modulos.
- `EventHandler<TEvent>`: contrato de handler.
- `EventDispatcher`: dispatcher em memoria, com registro por tipo.
- `DomainEventPublisher`: converte `FinancialEvent` em `AppEvent`.

Todo evento publicado contem `id`, `type`, `playerId`, `occurredAt`, `payload`, `correlationId`, `causationId`, `source` e `version`.

## Eventos

Eventos financeiros implementados/publicaveis:

- `AssetBought`
- `AssetSold`
- `YieldGenerated`
- `YieldCollected`
- `TransactionCreated`

Eventos de mercado/game loop:

- `MarketPricesUpdated`
- `CycleAdvanced`

Eventos de aplicacao documentados para evolucao:

- `PortfolioEvaluated`
- `MissionProgressUpdated`
- `MissionCompleted`
- `MentorTipGenerated`
- `CityStateUpdated`
- `CityRefreshRequested`
- `FlowCompleted`
- `FlowFailed`

## Responsabilidades

Financeiro valida e executa saldo, posicoes, transacoes, rendimento e integridade em centavos inteiros. Nao conhece mentor, cidade, UI, missoes ou game loop.

Game loop reage a eventos e snapshots, calcula progresso, desbloqueios, sinais visuais e feedback gamificado. Nao altera carteira diretamente.

Missoes processam eventos e snapshots para progresso educativo. Recompensas monetarias futuras devem passar por use case financeiro apropriado.

Mentor gera orientacao educativa e contextual. Nao executa operacoes nem promete ganho.

Cidade reflete progresso e estado projetado. Nao define saldo, posicao ou historico financeiro.

Persistencia salva entidades e historico. Regras complexas ficam fora dos repositories.

API valida formato basico, chama use cases e mapeia DTOs. UI apenas solicita acoes e exibe estado.

## Logs

Os logs registram:

- publicacao de eventos;
- handlers executados;
- handlers com falha;
- eventos financeiros publicados;
- conclusao dos fluxos de compra, venda, rendimento e ciclo.

Campos usados: `flowName`/`action`, `correlationId`, `playerId`, `durationMs`, `eventsEmitted`, `handlersExecuted`, `handlersFailed`, `errorCode` e `errorMessage` quando aplicavel.

## Side effects

Criticos:

- persistencia financeira;
- transacao/historico;
- integridade da carteira.

Nao criticos no MVP:

- dica do Mentor;
- atualizacao visual da cidade;
- progresso de missao;
- logs enriquecidos.

O `EventDispatcher` continua processando falhas de handlers nao criticos e registra `event_handler_failed`. Handlers marcados como `critical` podem interromper o despacho.

## Testes

Cobertura criada em `packages/application/test/InternalIntegrationEvents.test.ts`:

- compra valida publica `AssetBought` e chama handlers;
- falha nao critica do Mentor nao desfaz compra;
- compra invalida nao publica eventos de sucesso;
- venda publica `AssetSold`;
- rendimento pendente publica `YieldGenerated`;
- eventos carregam `correlationId` rastreavel em log.

Testes existentes de financeiro continuam garantindo centavos inteiros, bloqueio de saldo negativo, bloqueio de venda acima da posicao e rejeicao de floats monetarios.

## Riscos de acoplamento

- Evitar handlers grandes: eles devem coordenar e delegar.
- Evitar payloads enormes: carregar identificadores e valores essenciais.
- Evitar importacao de modulos visuais no dominio financeiro.
- Evitar side effects dentro da transacao financeira principal.
- Evoluir para outbox quando houver banco transacional real e necessidade de replay/auditoria de eventos.

## Decisoes

- Dispatcher em memoria para o MVP.
- Publicacao pos-persistencia nos use cases financeiros.
- Side effects nao criticos por padrao.
- `YieldCollected` passa a ser o nome canonico do evento de coleta de rendimento; `IncomeCollected` permanece aceito pelo game loop por compatibilidade interna.
- Mercado usa provider/interface; preco nao altera saldo.
