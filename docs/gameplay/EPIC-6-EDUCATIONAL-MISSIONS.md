# Epic 6 - Educational Missions

## Objetivo

O sistema de missoes educativas conecta eventos financeiros simulados, estado da carteira, Mentor Fortuna e Cidade Fortuna. As missoes do MVP usam criterios objetivos e testaveis, sem depender de lucro, valorizacao, compra na baixa, venda na alta ou qualquer mecanica de sorte.

## Regras de seguranca

- Missoes nao alteram saldo, carteira, posicoes ou rendimentos.
- Recompensas sao educativas, visuais ou de desbloqueio de ferramenta.
- Dinheiro continua representado em centavos inteiros.
- A avaliacao de missao consome eventos e snapshots; ela nao executa compra, venda ou rendimento.
- Regras de conclusao sao baseadas em eventos, comportamento observavel ou estado da carteira.

## Entregas implementadas

- Modelo `Mission`, `MissionProgress`, `MissionReward`, `MissionCompletionRule` e enums relacionados no dominio.
- Eventos de gameplay adicionais para missoes: `ASSET_PURCHASED`, `ASSET_SOLD`, `INCOME_COLLECTED`, `PORTFOLIO_UPDATED`, `MENTOR_TIP_READ`, `TRANSACTION_HISTORY_VIEWED`, `REPORT_VIEWED` e `MISSION_REWARD_CLAIMED`.
- Catalogo estatico `MVP_MISSIONS` com missoes educativas iniciais.
- `MissionEvaluator` para avaliar missoes por evento e por estado da carteira.
- `MissionService` para listar missoes, processar eventos, registrar conclusoes e resgatar recompensas uma unica vez.
- Integracao opcional do `GameLoopService` com `MissionEvaluator`.
- Testes unitarios e de fluxo cobrindo regras de evento, estado de carteira e recompensas.

## Missoes do MVP

| Missao                       | Criterio                                                              | Recompensa                   |
| ---------------------------- | --------------------------------------------------------------------- | ---------------------------- |
| Criar reserva inicial        | Caixa >= 10.000 moedas Fortuna                                        | Selo Primeira Reserva        |
| Primeiro passo na renda fixa | Evento `ASSET_PURCHASED` com `FIXED_INCOME`                           | Banco Comunitario            |
| Colher primeiro rendimento   | Evento `INCOME_COLLECTED` com valor > 0                               | Selo Primeiro Rendimento     |
| Conhecer fundos imobiliarios | Evento `ASSET_PURCHASED` com `FII`                                    | Centro Comercial             |
| Diversificar em 3 classes    | Carteira com 3 classes positivas, incluindo caixa quando houver saldo | Distrito da Diversificacao   |
| Manter saldo de seguranca    | Caixa >= 10% do patrimonio ou minimo de reserva                       | Dica avancada sobre liquidez |
| Consultar historico          | Evento `TRANSACTION_HISTORY_VIEWED`                                   | Relatorio basico da carteira |
| Ler dica do Mentor           | Evento `MENTOR_TIP_READ`                                              | Nova dica do Mentor          |
| Reduzir concentracao         | Maior classe <= 60% da carteira                                       | Dica sobre concentracao      |

## Integracao prevista

### Dominio financeiro

Os casos de uso financeiros continuam como fonte dos eventos de compra, venda e rendimento. O `GameEventService` traduz esses eventos em eventos de gameplay consumiveis por missoes, adicionando metadados de classe de ativo e valores em centavos.

### Cidade Fortuna

As recompensas retornam `targetId` estavel para o frontend ou servico de cidade desbloquear predios, distritos, relatorios e dicas. O resgate de recompensa registra evento de auditoria antes de emitir eventos de desbloqueio.

### Mentor Fortuna

O Mentor pode disparar `MENTOR_TIP_READ` quando uma dica for aberta e pode usar `educationalExplanation` e `cityRelation` das missoes para contextualizar feedback.

### API

Contratos planejados:

- `GET /players/{playerId}/missions`
- `GET /players/{playerId}/missions/{missionId}`
- `POST /players/{playerId}/missions/{missionId}/claim-reward`
- `POST /players/{playerId}/events`

TODO tecnico: conectar esses endpoints quando a API tiver repositorios compartilhados de eventos/progresso e um snapshot de carteira disponivel fora do `PlayerApiService` em memoria. A base de aplicacao ja esta pronta para receber essas dependencias por porta.
