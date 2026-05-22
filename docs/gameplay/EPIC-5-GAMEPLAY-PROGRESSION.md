# Epico 5 - Game loop, progressao e Cidade Fortuna

## Loop principal

O game loop coordena a experiencia depois que o nucleo financeiro conclui uma acao. Compra, venda, saldo, posicao, preco medio e rendimento continuam pertencendo ao dominio financeiro.

1. O jogador acessa a Cidade Fortuna.
2. A UI consulta saldo, carteira, patrimonio, alocacao e progresso por use cases.
3. O jogador acompanha missoes educativas.
4. Acoes financeiras sao executadas pelo nucleo financeiro.
5. Eventos financeiros, como `AssetBought`, `AssetSold` e `IncomeCollected`, chegam ao gameplay.
6. `GameEventService` converte fatos financeiros em eventos de gameplay.
7. `ProgressionService` aplica maturidade financeira, missoes, badges e marcos.
8. `UnlockService` libera distritos, ferramentas, classes e relatorios.
9. `CityEvolutionService` traduz progresso em nivel visual, predios e sinais da cidade.
10. `MentorFeedbackService` gera feedback educativo seguro.

## Eventos de gameplay

Eventos seguem o contrato serializavel `GameEvent`, com `playerId`, `type`, `occurredAt`, `source`, `correlationId` opcional e metadados simples. Valores financeiros em metadados devem usar centavos inteiros; percentuais devem usar basis points.

Eventos iniciais:

- `FIRST_BUY`
- `FIRST_SELL`
- `FIRST_INCOME_RECEIVED`
- `FIRST_DIVERSIFICATION`
- `NET_WORTH_REACHED`
- `MISSION_COMPLETED`
- `EMERGENCY_RESERVE_STARTED`
- `EMERGENCY_RESERVE_COMPLETED`
- `EXCESSIVE_CONCENTRATION_DETECTED`
- `NEW_DISTRICT_UNLOCKED`
- `NEW_ASSET_CLASS_UNLOCKED`
- `NEW_TOOL_UNLOCKED`
- `MARKET_CYCLE_ADVANCED`
- `PLAYER_LEVEL_UP`
- `EDUCATIONAL_BADGE_GRANTED`

## Progressao de maturidade financeira

A progressao nao usa ranking, sorte, multiplicador de lucro ou patrimonio como criterio unico.

1. Iniciante Financeiro: jogador criado.
2. Guardiao da Reserva: primeira compra e primeira missao educativa.
3. Investidor em Formacao: reserva iniciada, dois ciclos acompanhados e marco de patrimonio acompanhado.
4. Investidor Diversificado: primeira diversificacao e primeiro rendimento.
5. Estrategista de Longo Prazo: reserva completa, relatorio de diversificacao e tres missoes concluidas.
6. Cidadao Fortuna Avancado: cinco ciclos acompanhados, historico educativo e diversificacao mantida.

## Desbloqueios iniciais

- Distritos: `CENTRO_FINANCEIRO`, `DISTRITO_RESERVA`, `DISTRITO_INVESTIMENTOS`, `DISTRITO_FIIS`.
- Classes: `CASH`, `FII`.
- Ferramentas: `WALLET_SUMMARY`, `ALLOCATION_REPORT`, `CONCENTRATION_ALERT`.
- Relatorios: `EDUCATIONAL_EVENTS_HISTORY`.
- Medalhas: `PRIMEIRA_COMPRA_CONSCIENTE`, `CARTEIRA_DIVERSIFICADA`, `COLHEDOR_RENDIMENTOS`, `RESERVA_CONCLUIDA`.

## Criterios da Cidade Fortuna

- Cidade nivel 1: jogador criado.
- Cidade nivel 2: primeira compra e primeira missao.
- Cidade nivel 3: reserva iniciada e pelo menos duas classes conhecidas.
- Cidade nivel 4: carteira diversificada e primeiro rendimento.
- Cidade nivel 5: reserva formada e relatorio de diversificacao desbloqueado.

Predios e sinais visuais sao derivados de eventos educativos, nao apenas de lucro ou valorizacao de mercado.

## Use cases implementados

- `RegisterGameEventUseCase`: registra eventos, evita duplicidade em eventos unicos e preserva rastreabilidade.
- `EvaluateProgressionUseCase`: avalia maturidade, desbloqueios, badges e eventos de level up.
- `UnlockDistrictUseCase`: desbloqueia distritos sem duplicar eventos.
- `AdvanceMarketCycleUseCase`: atualiza precos via `MarketDataProvider` e dispara evento de ciclo.
- `GetPlayerProgressUseCase`: retorna progresso consolidado para API/UI.

## Recompensas permitidas

Recompensas sao educativas e deterministicas: crescimento visual da cidade, predios, badges, conquistas, missoes, relatorios e ferramentas. O MVP bloqueia recompensa aleatoria, bau, roleta, multiplicador de lucro, ranking por patrimonio e progressao baseada em sorte.

## Riscos de game design e mitigacoes

- Parecer cassino: evitar aleatoriedade visual de premio, roleta, bau e linguagem de sorte.
- Estimular giro excessivo: nao premiar volume de compra/venda nem day trade.
- Recompensar apenas lucro: exigir missoes, reserva, diversificacao, renda e ciclos acompanhados.
- Frustracao quando mercado cai: Mentor deve explicar oscilacao e foco de longo prazo.
- Punir iniciante demais: usar feedback positivo para etapas basicas e mensagens acionaveis.
- Simplificar demais conceitos: liberar ferramentas e classes por maturidade educativa.
- Ativos avancados cedo demais: exigir criterios antes de liberar classes mais complexas.
- Tom de recomendacao real: Mentor nao promete rentabilidade nem recomenda ativo especifico.
- Competicao por patrimonio: nao criar ranking por maior patrimonio no MVP.

## Proximas etapas

1. Conectar os use cases de gameplay a controllers quando a camada de API estiver pronta.
2. Persistir eventos e progresso em banco.
3. Modelar missoes educativas como entidade propria.
4. Expandir relatorios de composicao, renda recebida e concentracao.
5. Criar telemetria de eventos relevantes sem logs ruidosos.
