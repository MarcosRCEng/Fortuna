# Épico 12 - Integrações futuras, segurança e compliance

## Contexto

Fortuna é um jogo educacional de finanças e investimentos. No MVP, todos os
ativos, preços, carteiras, rendimentos e lançamentos são simulados. A arquitetura
deve permitir evolução futura para dados reais de mercado e integrações de
carteira somente leitura, mas o MVP não deve conectar provedores reais, importar
carteira real, armazenar credenciais de corretora ou executar ordens reais.

A regra financeira central continua obrigatória:

- 1 moeda Fortuna = R$ 0,01.
- Valores monetários são representados em centavos inteiros.
- `float`/decimal vindo de API externa nunca pode ser fonte de verdade.
- O MVP não permite saldo negativo, compra sem saldo, venda acima da posição ou
  alavancagem.
- Toda operação financeira válida deve gerar histórico imutável.
- Carteira simulada e carteira real futura devem permanecer separadas de forma
  explícita.

## Decisão arquitetural

Fortuna manterá o domínio financeiro independente de provedores externos.
Detalhes específicos de Brapi, B3 for Developers, MSN Money, Google Finance,
Yahoo Finance, provedores pagos ou agregadores pertencem a adapters de
infraestrutura. Use cases dependem de portas e DTOs normalizados. O domínio
recebe apenas modelos internos, centavos inteiros e metadados explícitos de
origem, ambiente e horário.

O MVP permanece mock-first:

- `MockMarketDataProvider` é o único provider de mercado em runtime.
- Providers reais planejados continuam como stubs.
- Flags de integração real ficam desligadas por padrão.
- Contratos de carteira real e broker ficam preparados, mas sem fluxo de usuário.
- Modelos de compliance, consentimento e auditoria ficam documentados e tipados.

## Estrutura de pastas proposta

O monorepo atual já segue separação entre domínio, aplicação e infraestrutura. O
Épico 12 estende esse padrão sem mover código existente:

```text
packages/
  domain/
    src/
      money/
      portfolio/
      market/
      compliance/          # políticas futuras, se virarem domínio
      audit/               # entidades futuras de auditoria imutável
  application/
    src/
      ports/
        MarketDataProvider.ts
        FutureIntegrationPorts.ts
      config/
        FutureIntegrationFlags.ts
      events/
        AuditEvents.ts
      use-cases/
  infrastructure/
    src/
      market-data/
        MockMarketDataProvider.ts
        FutureMarketDataProviders.ts
      audit/               # adapter futuro append-only
      consent/             # persistência/adapters futuros de consentimento
      config/              # seleção futura por ambiente/provider
  shared/
    src/
      errors/
        IntegrationErrors.ts
docs/
  architecture/
    epic-12-future-integrations-and-compliance.md
```

## Integrações futuras de dados de mercado

Futuros providers podem incluir Brapi, B3 for Developers, MSN Money, Google
Finance, Yahoo Finance, vendors pagos, APIs internas ou agregadores. Nenhum
desses nomes deve vazar para regras de domínio.

Providers plugáveis:

- Cada provider implementa uma porta de aplicação.
- A seleção do provider é feita por ambiente, configuração e feature flag.
- Um registry futuro pode escolher provider primário, fallbacks ou provider
  composto.
- Um normalizador converte payload externo para modelo interno antes dos use
  cases.
- Falhas de provider são registradas em logs estruturados e eventos de auditoria
  futuros.
- O domínio nunca lê campos externos como `regularMarketPrice`, `longName`,
  `currency`, `marketCap` ou status proprietário de vendor.

Seleção por ambiente:

- Local/MVP: somente mock.
- Desenvolvimento experimental: mock por padrão, stubs opcionais para status.
- Homologação: provider real só com flags e consentimento quando aplicável.
- Produção: provider real exige secrets, revisão legal, monitoramento, cache,
  fallback e disclosure de fonte na UI.

Múltiplos providers:

- `CompositeMarketDataProvider` pode consultar providers por prioridade.
- `CachedMarketDataProvider` pode responder snapshot recente quando live falhar.
- Preços divergentes não devem ser combinados silenciosamente.
- A UI deve mostrar fonte, data/hora e status quando houver dado real.
- `ProviderHealthService` deve acompanhar latência, rate limit, erros e
  degradação.

Dados incompletos, atrasados ou divergentes:

- Cotação antiga deve ser marcada como `STALE`.
- Cotação mockada deve ser marcada como `SIMULATED`.
- Cotação indisponível deve ser marcada como `UNAVAILABLE`.
- Dado stale/unavailable não pode virar preço de operação sem política explícita.
- IDs internos de ativo têm prioridade sobre tickers de provider.
- Metadados da cotação do provider devem ser preservados para auditoria.

## Interfaces e contratos TypeScript

Os contratos iniciais ficam em:

- `packages/application/src/ports/MarketDataProvider.ts`
- `packages/application/src/ports/FutureIntegrationPorts.ts`
- `packages/application/src/events/AuditEvents.ts`
- `packages/application/src/config/FutureIntegrationFlags.ts`
- `packages/shared/src/errors/IntegrationErrors.ts`

### MarketDataProvider

Responsabilidade: expor ativos, preços, histórico, informações educativas,
rendimento esperado e status de provider em modelos internos normalizados.

Métodos principais:

- `listAssets()`
- `getAsset(symbol)`
- `getCurrentPrice(symbol)`
- `getQuote(symbol)`
- `getPriceHistory(request)`
- `getExpectedYield(symbol)`
- `getEducationalInfo(symbol)`
- `refreshPrices(request)`
- `getProviderStatus()`

Entradas: símbolo interno ou request DTO da aplicação.

Saídas: `Asset`, `AssetPrice`, `MarketQuote`, `AssetHistoryPoint`,
`ExpectedYield`, `EducationalAssetInfo` e `MarketProviderStatus`.

Erros esperados: `ProviderUnavailableError`, `ProviderRateLimitError`,
`AssetNotFoundError`, `StaleMarketDataError`, `MarketClosedError`.

MVP: `MockMarketDataProvider`.

Pós-MVP: adapters reais, cache, fallback e provider composto.

Limites explícitos:

- Não usar float como preço autoritativo.
- Não deixar payload externo cruzar a fronteira da aplicação.
- Não tratar dado mockado como dado real.

Exemplo:

```ts
const quote = await marketDataProvider.getQuote("AEF001");
// quote.price é Money em centavos inteiros e quote.priceStatus indica qualidade/origem.
```

### PortfolioImportProvider

Responsabilidade: importar snapshot somente leitura de uma carteira real após
consentimento explícito.

Métodos principais:

- `importPortfolioSnapshot(userId, consentId)`
- `listSupportedInstitutions()`
- `validateConnection(userId, consentId)`

Entradas: `userId`, `consentId`.

Saídas: `RealPortfolioSnapshot`, lista de instituições, `ProviderHealthCheck`.

Erros esperados: `ConsentRequiredError`, `ConsentRevokedError`,
`UnauthorizedAccessError`, `ProviderUnavailableError`.

MVP: nenhuma implementação.

Pós-MVP: adapter somente leitura após revisão legal, segurança e consentimento.

Limites explícitos:

- Não modifica dados de corretora.
- Não mistura posições reais com `SimulatedWallet`.
- Não roda sem consentimento ativo.

### BrokerIntegrationProvider

Responsabilidade: definir contrato futuro para conta, posições, ordens e,
somente em produto muito mais avançado, envio de ordem.

Métodos principais:

- `getAccountSummary(userId, consentId)`
- `getPositions(userId, consentId)`
- `getOrders(userId, consentId)`
- `placeOrder(input)`

MVP: nenhuma implementação.

Pós-MVP inicial: leitura no máximo. `placeOrder` é apenas marcador contratual e
deve continuar desabilitado até decisão regulatória separada.

Limites explícitos:

- Não implementar ordem real no MVP.
- Não armazenar token de corretora no MVP.
- Não habilitar flags transacionais por padrão.

### ConsentService

Responsabilidade: criar, revogar e consultar consentimento explícito para acesso
a dados reais.

Métodos principais:

- `createConsent(input)`
- `revokeConsent(consentId, userId)`
- `getConsentStatus(consentId, userId)`
- `listConsentHistory(userId)`

Entradas: usuário, escopos, provider, validade e metadados.

Saídas: `ConsentRecord`, `ConsentStatus`.

Erros esperados: `ConsentRequiredError`, `ConsentRevokedError`,
`UnauthorizedAccessError`.

MVP: contrato tipado.

Pós-MVP: persistência, enforcement de revogação e trilha de auditoria.

Limites explícitos:

- Consentimento deve ter escopo.
- Consentimento revogado bloqueia acesso.
- Histórico deve ser preservado para auditoria.

### AuditService

Responsabilidade: registrar eventos append-only para ações financeiras,
providers, consentimento e compliance.

Métodos principais:

- `recordEvent(input)`
- `listEventsByUser(userId)`
- `listEventsByEntity(entityType, entityId)`

MVP: logs estruturados e histórico financeiro existente.

Pós-MVP: store append-only com retenção, exportação controlada e mascaramento.

Limites explícitos:

- Auditoria não pode vazar secrets.
- Campos sensíveis devem ser mascarados.
- Eventos devem carregar `correlationId`.

### CompliancePolicyService

Responsabilidade: validar limites educacionais e impedir mensagens ou acessos
proibidos.

Métodos principais:

- `validateMentorMessage(input)`
- `validateSimulationDisclaimer(surface)`
- `validateRealDataAccess(userId, consentId)`

MVP: Mentor continua baseado em regras educativas.

Pós-MVP: políticas mais fortes, revisão de conteúdo e validação de disclaimers
por superfície de UI.

Limites explícitos:

- Mentor Fortuna não faz recomendação personalizada real.
- O sistema não promete rentabilidade.
- A experiência não pode parecer cassino, aposta ou day trade gamificado.

### ProviderHealthService

Responsabilidade: acompanhar saúde, falhas e degradação de providers.

Métodos principais:

- `getProviderHealth(providerName)`
- `listProviderHealth()`
- `recordProviderFailure(providerName, error, metadata)`

MVP: status do mock provider e logs estruturados.

Pós-MVP: health checks, alertas, métricas de rate limit e circuit breaker.

### MarketClockService

Responsabilidade: modelar sessão de mercado, timezone, feriados e comportamento
de mercado fechado.

Métodos principais:

- `getMarketStatus(market, at)`
- `isTradingSessionOpen(market, at)`

MVP: status simulado opcional.

Pós-MVP: calendário de mercado, feriados, horários especiais e timezone seguro.

### AssetNormalizationService

Responsabilidade: mapear ativos/tickers externos para IDs internos e normalizar
cotações.

Métodos principais:

- `normalizeAsset(input)`
- `normalizeQuote(quote)`

MVP: símbolos fictícios internos.

Pós-MVP: aliases de ticker, código de bolsa, identificadores externos e alertas
de baixa confiança.

Limites explícitos:

- Ticker não é identidade primária.
- Símbolo de provider não vira ID interno.

## Plano de riscos técnicos

| Risco                                      | Impacto no produto        | Impacto no jogador                  | Impacto técnico          | Mitigação arquitetural                  | O MVP deve evitar                        |
| ------------------------------------------ | ------------------------- | ----------------------------------- | ------------------------ | --------------------------------------- | ---------------------------------------- |
| Preço defasado                             | UI mostra valor antigo    | Jogador interpreta mercado errado   | Snapshot incorreto       | `PriceStatus.STALE`, timestamp, TTL     | Ocultar horário                          |
| Mercado fechado                            | Cotação parece executável | Jogador confunde preço com execução | Regra de sessão          | `MarketClockService`                    | Assumir mercado sempre aberto            |
| Falha temporária de provider               | Feature degrada           | Dado some/confunde                  | Exceções e retry         | health service, fallback, erros tipados | Quebrar use case                         |
| API indisponível                           | Sem cotação real          | Perda de confiança                  | Downtime externo         | cache e status                          | Dependência rígida de uma API            |
| Ativo não encontrado                       | Ativo não aparece         | Posição fica incompleta             | Falha de mapeamento      | normalização com warnings               | Usar ticker como único ID                |
| Ticker divergente                          | Ativo errado              | Educação incorreta                  | Colisão de símbolos      | IDs internos                            | Persistir ticker externo como identidade |
| Ativo descontinuado                        | Histórico fica estranho   | Confusão sobre posição              | Ciclo de vida            | status de ativo                         | Apagar histórico                         |
| Mudança de código                          | Ticker antigo falha       | Dados desencontrados                | Migração de alias        | tabela de aliases                       | Hard-code de ticker                      |
| Split/desdobramento                        | Preço/quantidade mudam    | Ganho/perda aparente falso          | Ajuste histórico         | pipeline de eventos corporativos        | Assumir quantidade fixa                  |
| Grupamento                                 | Mesmo risco de split      | Mesmo risco                         | Mesmo risco              | eventos corporativos                    | Mesmo                                    |
| Dividendos                                 | Retorno total incompleto  | Renda subestimada                   | Evento de provento       | modelo de proventos                     | Tratar preço como retorno total          |
| JCP                                        | Risco tributário          | Mensagem líquida errada             | Regra Brasil             | tipo separado                           | Jogar tudo em dividendos                 |
| Proventos não reconhecidos                 | Histórico incompleto      | Sinal educativo errado              | Evento desconhecido      | status explícito                        | Ignorar silenciosamente                  |
| Corretagem                                 | Custo omitido             | Retorno superestimado               | Modelo de taxa           | line items futuros                      | Assumir custo zero                       |
| Taxas da bolsa                             | Mesmo                     | Mesmo                               | Componentização de custo | custos separados                        | Embutir tudo no preço                    |
| Impostos                                   | Risco legal               | Retorno líquido falso               | Regra complexa           | sem advice tributário                   | Cálculo simplista real                   |
| IOF, IR e custos futuros                   | Mesmo                     | Mesmo                               | Jurisdição               | revisão compliance                      | Prometer líquido                         |
| Arredondamentos                            | Drift de saldo            | Centavos errados                    | Precisão                 | centavos inteiros, bps                  | Introduzir float                         |
| Fechamento vs atual vs teórico vs execução | Cotação mal rotulada      | Confunde quote com ordem            | Tipo de preço            | metadados e labels                      | Chamar quote de execução                 |
| Divergência entre providers                | Confiança cai             | Valores diferentes                  | Reconciliação            | disclosure de fonte                     | Misturar providers silenciosamente       |
| Latência                                   | UX lenta                  | Fricção                             | Timeouts                 | cache e health                          | Domínio depender de rede                 |
| Rate limit                                 | Feature quebra            | Dado indisponível                   | Quota                    | cache/backoff                           | Polling agressivo                        |
| Caching                                    | Dado antigo               | Decisão com dado velho              | TTL                      | status + timestamp                      | Cache sem disclosure                     |
| Timezone                                   | Data errada               | Histórico confuso                   | Borda de dia             | timezone explícito                      | `Date` local implícito                   |
| Calendário de mercado                      | Status errado             | Expectativa errada                  | Feriados                 | calendar service                        | Só checar fim de semana                  |
| Feriados                                   | Mesmo                     | Mesmo                               | Mesmo                    | calendar service                        | Ignorar feriados locais                  |
| Moedas diferentes                          | Total errado              | Patrimônio falso                    | FX necessário            | campo `currency`                        | Assumir BRL sempre                       |
| Conversão cambial                          | Taxa/hora importam        | Total enganoso                      | Provider de câmbio       | snapshot de conversão                   | Converter sem fonte                      |

## Segurança futura

Recursos com dados reais exigem:

- Autenticação com sessão ou tokens seguros.
- Autorização por usuário, papel e ownership do recurso.
- Segregação de dados por usuário em todos os repositórios e providers.
- Papéis para jogador, admin, suporte e auditoria.
- TLS em tráfego externo e interno.
- Criptografia em repouso para dados sensíveis.
- Secrets fora do código, preferencialmente em secret manager.
- Tokens externos criptografados, escopados e mascarados em logs.
- Refresh token com expiração e rotação.
- Rotação de credenciais.
- Consentimento explícito antes de dados reais.
- Revogação validada antes de cada chamada a provider.
- Logs de auditoria para consentimento, provider e eventos financeiros.
- Mascaramento de dados sensíveis em logs e telas de suporte.
- Princípio do menor privilégio em chaves e permissões.
- Configurações separadas para local, dev, homologação e produção.
- Flags de produção desligadas até revisão técnica e legal.

Postura do MVP: não implementar autenticação complexa fora de escopo, mas também
não desenhar repositórios, use cases ou UI como se existisse apenas um usuário
global eterno.

## Compliance, responsabilidade e limites educacionais

Fortuna deve sempre diferenciar:

- Simulação.
- Educação financeira.
- Informação geral.
- Recomendação personalizada.
- Execução real.
- Leitura de dados reais.
- Integração com corretora.

Regras obrigatórias:

- Mentor Fortuna não pode fazer recomendação personalizada real.
- Fortuna não pode prometer rentabilidade.
- Fortuna não pode induzir comportamento especulativo.
- Fortuna não deve parecer cassino, aposta ou day trade gamificado.
- A UI deve deixar claro quando dados são simulados.
- Dados reais futuros devem mostrar fonte, data/hora e limitações.
- Uso de dados reais exige consentimento explícito.
- Revogação de consentimento deve ser respeitada.
- Carteira simulada e carteira real devem ter separação explícita.

Documentos/componentes futuros:

- Termos de uso.
- Política de privacidade.
- Aviso de simulação.
- Aviso de risco.
- Termo de consentimento para dados reais.
- Histórico de consentimento.
- Trilhas de auditoria.
- Registro de decisões do usuário.
- Registro de mensagens educativas exibidas pelo Mentor.

## Separação entre ambiente simulado e real

Nomenclatura:

- `SimulatedWallet`: carteira do jogo.
- `SimulatedTransaction`: transação do jogo.
- `RealPortfolioSnapshot`: snapshot real importado somente leitura.
- `ImportedPortfolioPosition`: posição importada de fonte externa.
- `MarketPriceSnapshot`: preço de mercado interno normalizado.
- `ProviderPriceQuote`: cotação derivada de provider após conversão de borda.
- `ConsentRecord`: estado de consentimento escopado.
- `AuditEvent`: evento relevante append-only.

Regras:

- A carteira simulada pertence ao jogo.
- Carteira real futura deve ser apenas leitura em uma primeira etapa.
- Execução de ordens reais é produto muito mais avançado, fora do MVP e fora do
  pós-MVP inicial.
- Qualquer integração real exige consentimento, auditoria e revisão legal.
- A UI não deve somar saldo simulado e patrimônio real sem separação explícita.
- Logs devem incluir `environment`, `source` e `correlationId`.
- Feature flags bloqueiam acesso acidental.
- Permissões devem ser checadas para dados reais.
- Testes devem provar que simulado e real não se misturam.

## Preparação no MVP

Decisões que devem ser mantidas desde agora:

- Interfaces bem definidas.
- Logs estruturados para eventos financeiros e de provider.
- Histórico financeiro imutável.
- `Money` em centavos inteiros.
- IDs internos separados de tickers externos.
- Separação entre domínio e infraestrutura.
- DTOs de entrada e saída.
- Normalizadores de dados.
- Camada de provider.
- Feature flags desligadas para integrações reais.
- Environment config explícita.
- Erros tipados.
- Auditoria mínima para eventos financeiros.
- Não usar float como fonte de verdade.
- Não espalhar lógica financeira na UI.
- Não acoplar use cases a mocks concretos.
- Não criar atalhos difíceis de remover depois.

## O que NÃO implementar no MVP

- Integração real com Brapi.
- Integração real com B3.
- Integração real com corretoras.
- Importação real de carteira.
- Envio de ordens reais.
- Autenticação bancária.
- Open Finance.
- Scraping de dados financeiros.
- Recomendação personalizada.
- Cálculo tributário real.
- Sincronização automática de carteira real.
- Cadastro de tokens de corretora.
- Armazenamento de credenciais externas.
- Execução de compra/venda real.
- Qualquer promessa de rentabilidade.
- Qualquer ranking que estimule especulação irresponsável.

## Roadmap incremental pós-MVP

### Fase 0 - MVP simulado

- Dados mockados.
- Carteira simulada.
- Missões.
- Mentor baseado em regras.
- Cidade Fortuna.
- Histórico financeiro simulado.
- Logs estruturados básicos.

### Fase 1 - Dados reais somente leitura

- `MarketDataProvider` real.
- Preços reais de mercado.
- Indicação de fonte e horário.
- Cache.
- Fallback para mock/cache por política explícita.
- Tratamento de falha de provider.
- UI deixando claro que a carteira continua simulada.

### Fase 2 - Importação manual de carteira

- Jogador informa posições manualmente.
- Sem conectar corretora.
- Separação entre carteira simulada e carteira informada.
- Mentor apenas educativo.
- Avisos claros.

### Fase 3 - Importação automática somente leitura

- Consentimento explícito.
- Integração com agregador ou API.
- Revogação de acesso.
- Auditoria.
- Criptografia.
- Sem execução de ordens.

### Fase 4 - Análises educativas com dados reais

- Análise de diversificação.
- Explicações de risco.
- Liquidez.
- Concentração.
- Sem recomendação personalizada de compra/venda.
- Sem promessa de resultado.

### Fase 5 - Integração transacional, apenas se decidido futuramente

- Fora do escopo atual.
- Exige revisão jurídica.
- Exige segurança forte.
- Exige compliance regulatório.
- Exige auditoria completa.
- Exige autorização explícita por operação.

## Eventos de auditoria

Campos mínimos:

- `id`
- `type`
- `userId` ou `playerId`
- `entityType`
- `entityId`
- `occurredAt`
- `metadata`
- `source`
- `environment`
- `correlationId`

Tipos iniciais:

- `PLAYER_CREATED`
- `SIMULATED_WALLET_CREATED`
- `SIMULATED_BUY_EXECUTED`
- `SIMULATED_SELL_EXECUTED`
- `MARKET_DATA_REQUESTED`
- `MARKET_DATA_PROVIDER_FAILED`
- `CONSENT_CREATED`
- `CONSENT_REVOKED`
- `REAL_PORTFOLIO_IMPORTED`
- `MENTOR_MESSAGE_SHOWN`
- `COMPLIANCE_WARNING_SHOWN`
- `FEATURE_FLAG_CHANGED`

Exemplo:

```ts
await auditService.recordEvent({
  type: AuditEventType.MARKET_DATA_PROVIDER_FAILED,
  entityType: "MarketDataProvider",
  entityId: "brapi",
  source: "api",
  environment: AuditEnvironment.DEV,
  correlationId: requestId,
  metadata: { reason: "rate_limit", fallbackUsed: false },
});
```

## Erros tipados

Erros iniciais em `shared`:

- `ProviderUnavailableError`
- `ProviderRateLimitError`
- `AssetNotFoundError`
- `StaleMarketDataError`
- `MarketClosedError`
- `ConsentRequiredError`
- `ConsentRevokedError`
- `UnauthorizedAccessError`
- `RealDataNotEnabledError`
- `SimulationOnlyError`
- `ComplianceViolationError`
- `InvalidMoneyAmountError`

Esses erros devem ser usados nas bordas de aplicação. Invariantes financeiras
continuam podendo usar erros específicos do domínio.

## Feature flags

Valores padrão do MVP:

```ts
{
  ENABLE_REAL_MARKET_DATA: false,
  ENABLE_PORTFOLIO_IMPORT: false,
  ENABLE_BROKER_INTEGRATION: false,
  ENABLE_REAL_PORTFOLIO_VIEW: false,
  ENABLE_TRANSACTIONAL_BROKER_ACTIONS: false,
  ENABLE_COMPLIANCE_STRICT_MODE: true,
  ENABLE_AUDIT_LOG_EXPORT: false,
  ENABLE_PROVIDER_FALLBACK: false,
  ENABLE_MARKET_DATA_CACHE: false,
}
```

Todas as flags de integração real devem ficar desligadas por padrão no MVP.

## Recomendações de testes

Adicionar ou preservar testes que provem:

- O domínio não depende de provider real.
- Dados mockados não são tratados como dados reais.
- Mentor não gera recomendação personalizada.
- Carteira simulada e carteira real não se misturam.
- Operações simuladas usam centavos inteiros.
- Feature flags bloqueiam integrações não habilitadas.
- `ConsentService` impede acesso sem consentimento ativo.
- `AuditService` registra eventos financeiros, provider e consentimento.
- Erros de provider são tratados sem quebrar invariantes do domínio.
- `MarketDataProvider` pode ser substituído sem alterar use cases.
- `AssetNormalizationService` mapeia símbolos externos para IDs internos.
- Preços stale aparecem com status explícito.
- UI de dado real mostra fonte, data/hora e limitações.

## Critérios de aceite

O Épico 12 é considerado concluído quando:

- O roadmap futuro está documentado.
- Interfaces e contratos existem para integrações futuras.
- O MVP não tem dependência de provedores reais.
- Simulado e real estão explicitamente separados.
- A lista "O que NÃO implementar no MVP" está clara.
- Riscos técnicos e legais/compliance estão documentados.
- Planos de consentimento e auditoria estão documentados.
- Recomendações de segurança estão documentadas.
- Recomendações de testes cobrem os riscos principais.
- Nenhuma regra financeira central foi violada.
- Nenhum float foi introduzido como fonte de verdade monetária.
- Nenhum comportamento de recomendação personalizada foi implementado no Mentor.

## Riscos legais e de compliance remanescentes

- A interpretação legal muda quando o escopo de produto muda.
- Termos de licenciamento de providers podem restringir cache, exibição e
  redistribuição de dados.
- Impostos, suitability e fronteira de recomendação exigem revisão profissional
  antes de dados reais.
- Integração com corretora pode exigir controles regulatórios muito além de um
  jogo educacional.
- Calendários de mercado, eventos corporativos e câmbio são complexos o bastante
  para épicos próprios.

## Resumo técnico do Épico 12

Arquivos criados/alterados:

- Criado `docs/architecture/epic-12-future-integrations-and-compliance.md`.
- Criado `packages/application/src/ports/FutureIntegrationPorts.ts`.
- Criado `packages/application/src/events/AuditEvents.ts`.
- Criado `packages/application/src/config/FutureIntegrationFlags.ts`.
- Criado `packages/shared/src/errors/IntegrationErrors.ts`.
- Atualizado `packages/application/src/index.ts`.
- Atualizado `packages/shared/src/index.ts`.

Decisões tomadas:

- Manter mock como único provider efetivo no MVP.
- Preparar contratos sem integração real.
- Separar carteira simulada de snapshot real futuro.
- Usar consentimento e auditoria como pré-requisitos para dados reais.
- Manter dinheiro em centavos inteiros.
- Tratar ticker externo como identificador de provider, não como identidade
  primária do domínio.

Preparado para o futuro:

- Provider real plugável.
- Provider health.
- Market clock.
- Normalização de ativo e cotação.
- Importação de carteira somente leitura.
- Broker provider futuro com `placeOrder` apenas como contrato bloqueado.
- Consentimento escopado.
- Auditoria tipada.
- Feature flags de integração real.
- Erros tipados para provider, consentimento, simulação e compliance.

Deliberadamente não implementado:

- Chamada real a API externa.
- Scraping.
- Credenciais externas.
- Importação real de carteira.
- Compra/venda real.
- Open Finance.
- Recomendação personalizada.
- Cálculo tributário real.
- Mistura de carteira simulada com real.

Próximos passos recomendados:

- Adicionar testes de contrato para feature flags, consentimento futuro e
  separação simulado/real.
- Criar um provider registry somente quando houver mais de um provider real ou
  cache em runtime.
- Detalhar ADR específico para consentimento antes de qualquer dado real.
- Detalhar política de UI para labels de simulação, fonte e timestamp.
- Planejar auditoria persistente append-only antes de importar carteira real.
