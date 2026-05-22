# Gameplay Base

Fortuna tera como experiencia principal a Cidade Fortuna, uma cidade financeira visual que cresce conforme o jogador evolui sua vida financeira.

## Principles

- A carteira e a fonte de verdade para dinheiro, posicoes e progresso financeiro.
- A progressao deve ser consequencia da evolucao financeira, diversificacao, renda e maturidade do jogador.
- O Mentor Fortuna atua como apoio educativo, explicando conceitos e ajudando o jogador a tomar decisoes mais conscientes.
- A experiencia deve evitar aparencia de cassino, pressao por especulacao irresponsavel ou promessas de ganho facil.
- O MVP deve priorizar clareza, seguranca financeira e aprendizado.

## Main loop

1. O jogador acessa a Cidade Fortuna.
2. A aplicacao consulta saldo, carteira, patrimonio, alocacao e evolucao por meio dos use cases financeiros.
3. O jogador recebe ou acompanha uma missao educativa.
4. Compra, venda e colheita de rendimentos sao executadas somente pelo nucleo financeiro.
5. Use cases financeiros retornam eventos de dominio, como `AssetBought`, `AssetSold` e `IncomeCollected`.
6. `GameLoopService` recebe esses eventos e snapshots ja calculados, sem validar saldo, posicao, preco medio ou rendimento.
7. `GameEventService` transforma fatos financeiros em eventos de gameplay.
8. `ProgressionService` aplica experiencia, niveis, marcos e historico de progresso.
9. `UnlockService` libera distritos, classes de ativos, ferramentas e badges educativos.
10. `MentorFeedbackService` gera feedback educativo sem prometer ganhos ou incentivar especulacao.
11. `CityEvolutionService` traduz o progresso em sinais visuais para a Cidade Fortuna.

## Application services

- `GameLoopService`: orquestra a experiencia de gameplay depois que o dominio financeiro ja decidiu o resultado financeiro.
- `GameEventService`: cria eventos de gameplay logaveis, testaveis e futuramente persistiveis.
- `ProgressionService`: evolui nivel, experiencia, missoes, badges e marcos de patrimonio.
- `UnlockService`: decide desbloqueios com base no progresso do jogador.
- `CityEvolutionService`: descreve a evolucao visual da cidade de forma independente da UI.
- `MentorFeedbackService`: converte eventos em mensagens educativas.

## Event model

Eventos de gameplay usam `GameEvent`:

```ts
type GameEvent = {
  id: string;
  playerId: string;
  type: GameEventType;
  occurredAt: Date;
  metadata?: Record<string, string | number | boolean>;
};
```

Datas podem ser serializadas com `serializeGameEvent`. Valores financeiros em metadata devem usar centavos inteiros, por exemplo `amountCents` ou `totalEquityCents`. Percentuais devem usar basis points.
