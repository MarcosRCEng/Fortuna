# Epic 9 - UI financeira do MVP

## Decisao de implementacao

A base `apps/web` ja existia como React + Vite, mas ainda era um bootstrap. A entrega evolui essa app de forma incremental, sem adicionar roteador externo: a navegacao inicial usa estado local e componentes separados por layout, financeiro, educacao e feedback.

Os contratos visuais seguem a API existente (`assets`, `players/:id/wallet`, `buy`, `sell`, `collect income`, `transactions`, `mentor`). Como a criacao de jogador, missoes e progressao ainda nao formam uma jornada completa de front-end, a UI usa um adapter mockado isolado em `src/services/mockFortunaFinancialService.ts`. A fronteira esta em `FortunaFinancialPort`, permitindo troca posterior por HTTP sem reescrever telas.

## Mapa de telas

- Dashboard: saldo, patrimonio, valor investido, alocacao, missoes proximas, Mentor e Cidade Fortuna.
- Carteira: posicoes, valor atual, preco medio, rendimentos acumulados e diversificacao.
- Ativos: catalogo mockado, detalhe educativo, badges e operacoes.
- Compra: quantidade inteira, custo total, saldo apos compra, bloqueio preventivo e modal.
- Venda: posicao atual, quantidade maxima, valor estimado, saldo apos venda e modal.
- Rendimentos: eventos disponiveis/recebidos, origem e explicacao educativa.
- Historico: timeline de compras, vendas e rendimentos.
- Missoes: cards com criterio, progresso, recompensa e explicacao.
- Mentor: dicas contextuais sem recomendacao financeira.
- Cidade Fortuna: nivel, areas desbloqueadas e proximos desbloqueios.

## Componentes

- Layout: `AppLayout`.
- Financeiros: `BalanceCard`, `EquityCard`, `InvestedCard`, `AssetCard`, `PositionCard`, `IncomeCard`, `AllocationChart`.
- Badges: risco, liquidez, classe, dados mockados e mercado.
- Educativos: `MentorPanel`, `MissionCard`, `CitySummaryPanel`.
- Feedback: loading, empty, error, success, operation blocked e confirmation modal.

## Fluxos

Compra:
1. jogador abre detalhe do ativo;
2. UI mostra saldo, preco, risco, liquidez e dados mockados;
3. quantidade inteira calcula custo em centavos;
4. UI bloqueia quantidade invalida, saldo insuficiente, ativo indisponivel ou mercado atualizando;
5. modal resume ativo, quantidade, preco, custo, saldo apos compra e autoridade do backend;
6. adapter envia a operacao e trata erro do dominio como decisao final;
7. sucesso usa microcopy sobria e educativa.

Venda:
1. jogador abre detalhe de ativo com posicao;
2. UI mostra quantidade disponivel, preco atual e valor estimado;
3. UI bloqueia venda acima da posicao, quantidade invalida, ativo inexistente ou mercado atualizando;
4. modal resume quantidade, valor estimado, posicao restante e saldo apos venda;
5. sucesso fala de rebalanceamento, liquidez ou estrategia, sem reforcar aposta em lucro.

Rendimentos, missoes e Mentor:
- rendimentos explicam renda passiva simulada;
- missoes indicam criterio e recompensa educativa;
- Mentor alerta sobre diversificacao, liquidez, mock data e risco.

## Regras de UX financeira

- Valores monetarios trafegam e sao calculados em centavos inteiros.
- A UI faz validacao preventiva, mas nao e fonte final de regra financeira.
- Operacoes criticas exigem confirmacao.
- Erros sao educativos e acionaveis.
- Sucessos sao positivos e sobrios.
- Dados mockados aparecem de forma discreta e clara.
- Linguagem evita FOMO, promessa de ganho, cassino, jackpot, multiplicadores ou urgencia artificial.

## Riscos e mitigacoes

- Interpretar o jogo como recomendacao real: badge de dados simulados e microcopy no dashboard, ativos e modal.
- Focar apenas em lucro/prejuizo: telas enfatizam risco, liquidez, diversificacao e historico.
- Confundir variacao simulada com mercado real: `MockDataBadge` em cards e detalhe.
- Achar que risco alto e melhor oportunidade: explicacao de risco no detalhe do ativo.
- Confundir rendimento com garantia: textos de rendimentos e FIIs deixam claro que e simulacao.
- Operar por impulso: modal obrigatorio e botao "Revisar impacto".
- Nao entender liquidez: badge e texto dedicado em cada ativo.
- Nao perceber concentracao: grafico de alocacao e dica do Mentor.

## Plano incremental

1. Base visual e layout: concluido para MVP.
2. Carteira e ativos: concluido com mock isolado.
3. Compra e venda: concluido com validacao preventiva e modal.
4. Historico e rendimentos: concluido em versao inicial.
5. Missoes e Mentor: concluido em cards e painel.
6. Cidade Fortuna: concluido como resumo visual, pronto para cena isometrica futura.
7. Refinamento: pendente para acessibilidade automatizada, E2E e integracao HTTP real.

## Testes planejados e adicionados

Adicionados:
- formatacao monetaria;
- quantidade inteira;
- total em centavos;
- saldo apos compra/venda;
- bloqueio de compra sem saldo;
- bloqueio de compra com mercado atualizando;
- bloqueio de venda acima da posicao;
- bloqueio de venda sem posicao;
- validacoes preventivas validas.

Planejados:
- testes de componentes com uma biblioteca de teste React;
- fluxo de usuario compra/venda com mocks;
- acessibilidade basica;
- renderizacao visual responsiva com browser automation.

## Limitacoes

- O adapter HTTP real ainda nao foi conectado.
- A UI usa navegacao local ate o projeto decidir por um roteador.
- Missoes e Cidade Fortuna usam snapshots mockados ate endpoints especificos ficarem disponiveis.
- O visual isometrico completo da cidade fica para epico futuro.
