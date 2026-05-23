# Status de Implementação — Fortuna

## Data da auditoria

2026-05-23.

## Visão geral

O núcleo atual do Fortuna compila e os testes automatizados passam. A arquitetura segue separada em domínio, aplicação, infraestrutura, API Nest e web. O MVP permanece baseado em dados mockados, carteira simulada e operações financeiras em centavos inteiros.

Durante a auditoria foram corrigidos o contrato HTTP de erros financeiros, a documentação Swagger de respostas e valores monetários, a resolução do `AppModule` por teste automatizado, a geração do Prisma Client da infraestrutura e a execução real de cobertura do Vitest.

## Comandos executados

| Comando | Resultado | Observações |
|---|---|---|
| `pnpm install` | Falhou | O binário `pnpm` não está no `PATH` do shell atual. O projeto usa Corepack; `corepack pnpm install` executou com sucesso. |
| `corepack enable` | Falhou | Sem permissão para criar shim global em `C:\Program Files\nodejs\pnpm`; não afeta execução via Corepack. |
| `corepack pnpm install` | OK | Workspace atualizado. A auditoria expôs que o Prisma Client precisava ser gerado explicitamente para o schema da infraestrutura. |
| `pnpm build` | OK | Executado via `corepack pnpm build`; após adicionar `db:generate`/`postinstall` e rodar `corepack pnpm --filter @fortuna/infrastructure db:generate`, todos os pacotes compilam. |
| `pnpm test` | OK | Executado via `corepack pnpm test`; todos os testes passam. |
| `pnpm test:coverage` | OK | Executado via `corepack pnpm test:coverage`; cobertura agora é gerada com `@vitest/coverage-v8`. |

## Implementado

- Monorepo pnpm com `apps/api`, `apps/web`, `packages/domain`, `packages/application`, `packages/infrastructure`, `packages/shared` e `packages/testing`.
- `AppModule` importa `HealthModule`, `WalletModule`, `AssetsModule`, `MarketModule`, `TransactionsModule`, `MissionsModule`, `ProgressionModule`, `MentorModule` e `PlayerModule`.
- API Nest com endpoints de health, players, carteira, compra, venda, coleta de rendimento, histórico, assets, market e mentor.
- `PlayerApiService` orquestra use cases reais da camada de aplicação usando repositórios in-memory para o MVP.
- Domínio financeiro com `MoneyCents`, `PlayerAccount`, `Wallet`, `Position`, `Order`, `PortfolioSnapshot`, `Transaction`, `Quantity`, `AssetSymbol` e erros financeiros explícitos.
- Use cases financeiros principais: criar jogador, comprar ativo, vender ativo, consultar carteira, consultar alocação, histórico e coletar rendimento.
- Provider mockado de mercado com interface `MarketDataProvider`/`MarketPriceProvider`, símbolos estáveis, preços em centavos e dados determinísticos.
- Persistência Prisma já modelada em infraestrutura, com centavos em `Int` e testes de integração marcados como skip quando dependem de banco real.
- Swagger em `/docs` com tags organizadas e DTOs para endpoints existentes.
- Filtro global de exceções com contrato HTTP padronizado:

```json
{
  "statusCode": 400,
  "code": "INSUFFICIENT_BALANCE",
  "message": "Insufficient balance to complete the operation.",
  "details": {
    "requiredAmountCents": 100000,
    "availableAmountCents": 50000
  },
  "timestamp": "2026-05-23T00:00:00.000Z",
  "path": "/api/v1/players/player-1/buy"
}
```

## Sprint 14 - Persistencia Prisma/PostgreSQL

Status: implementada com persistencia real selecionavel por ambiente.

- Prisma esta configurado em `packages/infrastructure/prisma`, com migration versionada e Prisma Client gerado por `pnpm prisma:generate`.
- PostgreSQL local sobe por `docker compose up -d` usando database `fortuna`, user `fortuna`, password `fortuna_dev` e porta `5432`.
- A API permanece em memoria por padrao, mas usa Prisma quando `FORTUNA_PERSISTENCE=prisma`.
- `PrismaService` foi adicionado ao boundary de database da API e e importado apenas no modo Prisma.
- Operacoes criticas de criar jogador, comprar, vender e coletar rendimento usam `PrismaFinancialOperationsService` com `prisma.$transaction` e locks `FOR UPDATE`.
- Valores monetarios do schema usam `Int` em centavos inteiros; nao ha `Float` como fonte de verdade.
- Positions zeradas em venda sao removidas. O historico permanece em `transactions` com `position_before_quantity` e `position_after_quantity`.
- Adapters em memoria foram preservados e continuam sendo o padrao dos testes unitarios e da API sem banco.
- Testes de integracao Prisma existem em `packages/infrastructure/test/persistence` e sao opt-in via `FORTUNA_TEST_DATABASE_URL`.

Comandos locais:

```bash
docker compose up -d
pnpm prisma:migrate
pnpm prisma:generate
corepack pnpm --filter @fortuna/infrastructure db:seed
$env:FORTUNA_PERSISTENCE="prisma"; pnpm dev:api
```

Limitacoes conhecidas:

- Testes Prisma dependem de um PostgreSQL de teste informado por `FORTUNA_TEST_DATABASE_URL`; sem a variavel, ficam pulados.
- A API ainda concentra os endpoints financeiros em `PlayerApiService`; a separacao por modulos Nest pode evoluir em sprint futura.
- Catalogo de assets persistido depende do seed em ambientes novos.

Validacao desta sprint:

- `corepack pnpm install`: OK.
- `corepack pnpm prisma:generate`: OK.
- `corepack pnpm build`: OK.
- `corepack pnpm test`: OK; suite Prisma ficou pulada sem `FORTUNA_TEST_DATABASE_URL`.
- `corepack pnpm test:coverage`: OK.
- `docker compose up -d`: bloqueado no shell atual porque `docker` nao esta no PATH.
- `corepack pnpm prisma:migrate` sem `.env`: falhou por `DATABASE_URL` ausente, esperado enquanto `.env` real nao existir.
- `corepack pnpm prisma:migrate` com `DATABASE_URL=postgresql://fortuna:fortuna_dev@localhost:5432/fortuna`: bloqueado pelo PostgreSQL local atual, que rejeitou as credenciais `fortuna`/`fortuna_dev`. A causa provavel e uma instancia local preexistente diferente do `docker-compose.yml`.
- Teste Prisma com `FORTUNA_TEST_DATABASE_URL=postgresql://fortuna:fortuna_dev@localhost:5432/fortuna`: bloqueado pelo mesmo erro de autenticacao local.

## Parcial

- `WalletModule`, `TransactionsModule`, `MissionsModule` e `ProgressionModule` existem como módulos vazios ou placeholders na API; a orquestração pública ainda passa majoritariamente por `PlayerApiService`.
- Testes da API cobrem health, resolução do `AppModule` e contrato de erro, mas ainda não exercitam todos os endpoints por HTTP end-to-end.
- Swagger cobre os endpoints existentes, mas ainda pode evoluir com exemplos completos de payload por operação.
- Persistência Prisma existe, mas não está conectada como storage padrão da API do MVP.
- A UI já possui componentes financeiros e cidade, mas esta sprint não estabilizou a experiência visual completa.

## Pendente

- Separar controllers/use cases por módulo de API quando a persistência e os fluxos crescerem além do MVP in-memory.
- Adicionar testes HTTP de integração para compra, venda, histórico, assets e market.
- Ativar testes de integração Prisma em ambiente de banco controlado.
- Formalizar autenticação/autorização quando sair do escopo MVP local.
- Persistência robusta como padrão de execução da API.
- Integrações reais de mercado, mantendo conversão explícita para centavos inteiros.

## Riscos técnicos

- A API ainda depende de repositórios in-memory no `PlayerApiService`, então o estado é volátil.
- A cobertura de API é baixa em linhas, apesar de o contrato de erro e o `AppModule` estarem cobertos.
- Alguns módulos Nest são placeholders sem controllers/providers próprios.
- Testes Prisma estão pulados sem banco real configurado.
- Valores monetários usam `number` em TypeScript para centavos; isso é aceito no MVP com `Number.isSafeInteger`, mas deve ser reavaliado se valores crescerem além do limite seguro.
- `Money.formatBRL()` usa `toFixed` apenas para apresentação, não como fonte de verdade financeira.
- Não há autenticação no MVP.

## Regras financeiras centrais

| Regra | Status | Evidência |
|---|---|---|
| Dinheiro em centavos inteiros | OK | `MoneyCents.fromCents`, DTOs `*Cents`, Prisma `Int` para campos monetários e mocks `priceCents`. |
| Sem float como fonte de verdade | OK | `MoneyCents` rejeita valores não inteiros; cálculos de preço usam centavos e basis points. |
| Sem saldo negativo | OK | `MoneyCents` rejeita negativo e `PlayerAccount.debit` bloqueia débito acima do saldo. |
| Sem compra sem saldo | OK | `BuyAssetUseCase` valida saldo, lança `INSUFFICIENT_BALANCE` e não cria transação. |
| Sem venda acima da posição | OK | `SellAssetUseCase`/`Position` validam quantidade disponível e lançam `INSUFFICIENT_POSITION`. |
| Sem alavancagem no MVP | OK | Não há crédito/margem; compra usa apenas `availableBalance`. |
| Histórico para operação válida | OK | Compra, venda e coleta de rendimento criam `Transaction` e persistem via `TransactionRepository`. |

## Swagger/OpenAPI

Swagger está disponível em `/docs`. Os endpoints possuem tags, summaries, DTOs de entrada/saída e respostas de erro relevantes. Campos monetários públicos foram descritos como centavos inteiros, reforçando `1 moeda Fortuna = R$ 0,01` e evitando sugestão de uso de decimal/float como dinheiro.

## Testes e cobertura

- `corepack pnpm test`: OK, com 93 testes passando no total.
- `corepack pnpm test:coverage`: OK, com relatório V8 gerado.
- Cobertura por workspace na auditoria final:
  - `packages/domain`: 55,46% statements.
  - `packages/application`: 86,48% statements.
  - `packages/infrastructure`: 34,96% statements.
  - `apps/api`: 42,62% statements.
  - `apps/web`: 27,69% statements.
- Pontos críticos cobertos: criação e operações de Money, rejeição de centavos inválidos, compra com saldo, rejeição de compra sem saldo, venda com posição, rejeição de venda acima da posição, coleta de rendimento, histórico/transações, mocks de mercado e contrato HTTP de erros financeiros.
- Lacunas relevantes: endpoints principais ainda precisam de testes HTTP end-to-end; integração Prisma depende de ambiente de banco e permanece pulada.

## Próximos passos recomendados

- Criar testes HTTP de contrato para os fluxos `/api/v1/players`, `/buy`, `/sell`, `/transactions`, `/assets` e `/market`.
- Mover gradualmente a composição de providers in-memory para módulos Nest mais específicos quando a persistência real entrar.
- Definir ambiente de teste Prisma automatizado para remover skips de integração.
- Adicionar exemplos completos de request/response no Swagger para operações financeiras principais.
- Manter a regra de centavos inteiros como gate obrigatório antes de integrar qualquer provider real de mercado.
