# Cidade Fortuna Visual Progression

## Objetivo

A Cidade Fortuna e um dashboard visual de progressao educativa. Ela nao representa aposta, ganho rapido ou recompensa financeira real. Cada predio traduz dados ja existentes da jornada em maturidade, liquidez, risco, diversificacao, renda recorrente simulada e aprendizado.

## Estagios Visuais

- Stage 0: predio bloqueado, mostrado como terreno, fundacao ou silhueta leve. O jogador entende que existe progresso futuro.
- Stage 1: fundacao ou primeiros passos, usado quando ha requisito minimo.
- Stage 2: crescimento, usado quando o comportamento aparece de forma recorrente ou com mais de uma dimensao.
- Stage 3: maturidade, usado quando ha consistencia, diversificacao ou progresso educativo alto.

## Predios E Regras

- Prefeitura Financeira: evolui com patrimonio simulado, missoes, diversificacao e consistencia geral.
- Banco da Reserva: evolui com saldo disponivel, ativos conservadores, liquidez e ausencia de sinais de fragilidade.
- Bolsa da Cidade: evolui com renda variavel simulada, historico de decisao e controle de concentracao.
- Centro Imobiliario: evolui com FIIs ou ativos imobiliarios simulados, rendimentos e diversificacao.
- Escola Financeira: evolui com missoes concluidas e leitura de conceitos.
- Parque dos Rendimentos: evolui com rendimento disponivel, rendimento coletado e recorrencia.
- Torre do Mentor: evolui com mensagens, alertas contextuais e interacoes com mercado, carteira e missoes.

## Sinais De Acao

- Parque dos Rendimentos mostra acao quando ha rendimento coletavel.
- Escola Financeira mostra acao quando ha missao educativa pendente ou concluivel.
- Torre do Mentor mostra acao quando existe mensagem recente.
- Banco da Reserva mostra alerta discreto quando ha saldo, mas a reserva visual ainda esta baixa.
- Bolsa da Cidade mostra alerta educativo quando ha concentracao elevada.

## Composicao Da Cena

A cena e composta por camadas independentes:

- Background claro com sensacao de ceu e cidade limpa.
- Base isometrica de tiles, pracas e areas verdes.
- Ruas e cruzamentos conectando os predios.
- Decoracao urbana com arvores, bancos, luminarias, fonte e marcadores sutis.
- Predios individuais por stage usando PNGs em `/assets/city/buildings`.
- HUD lateral com resumo, status e detalhe do predio selecionado.

## Responsividade

No desktop, o mapa fica amplo com HUD lateral. Em tablets, o HUD sobe para preservar o mapa. Em telas pequenas, o mapa mantem largura minima e permite scroll horizontal para nao quebrar labels ou sobrepor predios.

## Garantias De Posicionamento

- Sem cassino, roleta, fichas, slot machine, bau de tesouro ou neon agressivo.
- Sem chuva de moedas ou promessa visual de riqueza rapida.
- Predios sao clicaveis e acessiveis por teclado.
- Fallback visual aparece se um PNG nao carregar, com log apenas em desenvolvimento.
