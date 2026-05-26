# Release Checklist - Fortuna MVP

Validation date: 2026-05-26

Integration branch: `integration/mvp-sprints-14-23`

Status: build, test suite, coverage, e2e, and Prisma client generation passed.
PostgreSQL migration/seed validation is blocked in this workstation because the
local database already has migration `202605220001_init_fortuna_persistence`
applied with a different checksum. Do not run `prisma migrate reset` without
explicit approval because it drops local data.

## Build e testes
- [x] `corepack pnpm install` executado com sucesso
- [x] `corepack pnpm build` executado com sucesso
- [x] `corepack pnpm test` executado com sucesso
- [x] `corepack pnpm test:coverage` executado com sucesso
- [x] `corepack pnpm test:e2e` executado com sucesso
- [x] `corepack pnpm prisma:generate` executado com sucesso

## Banco e seed
- [ ] Migrations aplicadas
- [ ] Seed/demo executado
- [ ] Dados demo validados
- [x] `.env` criado a partir de `.env.example`
- [ ] PostgreSQL via Docker Compose validado neste ambiente
- [ ] Drift de migration local revisado antes de resetar ou recriar o banco

## Seguranca
- [ ] DTOs rejeitam campos extras
- [ ] Entradas textuais sao sanitizadas
- [ ] Logs nao vazam dados sensiveis
- [ ] Erros nao expoem stack trace em producao

## Financeiro simulado
- [ ] Compra sem saldo bloqueada
- [ ] Venda acima da posicao bloqueada
- [ ] Valores financeiros usam centavos inteiros
- [ ] Historico e gerado para operacoes validas
- [ ] Operacoes financeiras criticas sao transacionais

## Observabilidade
- [ ] Correlation id aparece nas respostas
- [ ] Correlation id aparece nos logs
- [ ] Erros financeiros sao rastreaveis por correlation id

## UX minima
- [ ] Fluxo jogavel completo funciona
- [ ] Usuario entende sucesso/erro apos cada acao
- [ ] Mentor, missoes e cidade refletem os eventos do jogador

## Documentacao de release
- [x] `CHANGELOG.md` criado
- [x] `VERSIONING.md` criado
- [x] `docs/releases/v0.2.0-mvp-playable.md` criado
- [x] README atualizado para `v0.2.0 - Playable MVP`
- [x] Tag local sugerida `v0.1.0-bootstrap` criada para o estado anterior da main
