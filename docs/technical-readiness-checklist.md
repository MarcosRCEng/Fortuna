# Technical Readiness Checklist

## Financial Features

- [ ] Possui teste unitario de caminho feliz.
- [ ] Possui teste unitario de regra invalida.
- [ ] Garante que saldo nao muda em operacao invalida.
- [ ] Garante que posicao nao muda em operacao invalida.
- [ ] Garante que historico nao e criado indevidamente.
- [ ] Usa centavos inteiros como fonte de verdade.
- [ ] Nao usa float para dinheiro.
- [ ] Gera log INFO em operacao valida relevante.
- [ ] Gera log WARN em bloqueio de regra de negocio.
- [ ] Gera historico financeiro quando aplicavel.

## Endpoints

- [ ] Endpoint documentado no Swagger/OpenAPI.
- [ ] Possui exemplo de request.
- [ ] Possui exemplo de response de sucesso.
- [ ] Possui exemplo de response de erro.
- [ ] Retorna status HTTP adequado.
- [ ] Possui teste de API ou integracao.
- [ ] Esta presente na colecao Bruno/Postman, quando aplicavel.

## Financial Bugs

- [ ] Bug reproduzido por teste automatizado.
- [ ] Correcao implementada.
- [ ] Teste regressivo adicionado.
- [ ] Logs revisados para facilitar auditoria futura.

## Logs

- [ ] Log possui event/action identificavel.
- [ ] Log possui module/context.
- [ ] Log possui playerId quando aplicavel.
- [ ] Log possui operationId quando aplicavel.
- [ ] Log possui valores financeiros em centavos.
- [ ] Log nao expoe dados sensiveis desnecessarios.
- [ ] Log nao e generico demais.
