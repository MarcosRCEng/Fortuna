# Release Checklist - Fortuna MVP

## Build e testes
- [ ] `pnpm install` executado com sucesso
- [ ] `pnpm build` executado com sucesso
- [ ] `pnpm test` executado com sucesso
- [ ] `pnpm test:coverage` executado com sucesso
- [ ] `pnpm test:e2e` executado com sucesso

## Banco e seed
- [ ] Migrations aplicadas
- [ ] Seed/demo executado
- [ ] Dados demo validados

## Segurança
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
