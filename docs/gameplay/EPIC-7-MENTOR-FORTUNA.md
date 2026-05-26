# Epic 7 - Mentor Fortuna

## Objetivo

O Mentor Fortuna orienta o jogador com mensagens educativas, seguras e contextuais sobre carteira, eventos financeiros, missoes e progresso da Cidade Fortuna. No MVP ele e deterministico, baseado em regras testaveis, sem IA generativa e sem recomendacao personalizada real de investimento.

## Encaixe arquitetural

- `packages/domain/src/mentor`: contratos puros do dominio, enums, contexto, regra e dica.
- `packages/application/src/mentor`: catalogo de mensagens, regras iniciais, servico deterministico e use case.
- `apps/api/src/modules/mentor`: endpoints HTTP para avaliar e listar dicas.
- Futuro `packages/infrastructure/src/mentor`: persistencia de dicas vistas, dispensadas e logs analiticos, quando o projeto tiver storage definitivo.

O Mentor nao altera regras financeiras centrais. Valores monetarios continuam representados por `MoneyCents`, em centavos inteiros.

## Modelo de dominio

- `MentorRule`: id, codigo, nome, descricao, prioridade, status, tipo de gatilho, condicoes, cooldown, limite de ocorrencias, conceitos educativos e `evaluate(context)`.
- `MentorTip`: id, regra, tipo, titulo, mensagem, conceito, severidade, acao opcional, missao relacionada, ativo relacionado, data e metadata.
- `MentorContext`: jogador, caixa, patrimonio, posicoes, alocacao, eventos recentes, missoes, progresso da cidade, dicas ja exibidas e momento do game loop.
- `MentorTipProvider`: contrato para buscar dicas disponiveis, por regra, por conceito e ja exibidas.
- `RuleBasedMentorService`: avalia regras habilitadas, aplica prioridade, cooldown e limite de repeticao, gera dicas e registra logs estruturados.

## Tipos de dicas

- Dica fixa: conteudo geral para sessao, home e carteira.
- Dica por evento: compra, venda, rendimento e missao.
- Dica por ativo: renda fixa, FII e acao.
- Dica por composicao: reserva, concentracao, caixa e diversificacao.
- Alerta educativo: risco ou decisao que merece reflexao, sem bloquear.
- Explicacao de conceito: risco, liquidez, dividendos, juros e outros.
- Parabens por comportamento saudavel: diversificacao, reserva e rendimento.

## Regras implementadas agora

- Primeira compra: disparada por `AssetBought`.
- Primeira renda fixa: disparada por compra de `FIXED_INCOME` ou `TREASURY`.
- Primeiro FII: disparada por compra de `FII`.
- Primeira acao: disparada por compra de `STOCK`.
- Primeiro rendimento: disparada por `IncomeCollected` ou `FIRST_INCOME_RECEIVED`.
- Jogador sem reserva: dispara quando caixa mais ativos de liquidez simples fica abaixo do alvo.
- Carteira muito concentrada: dispara quando um ativo ou tipo passa de 70% da carteira.
- Excesso de caixa: dispara quando caixa passa de 80% do patrimonio na tela de carteira.
- Diversificacao alcancada: dispara com pelo menos 3 posicoes, 2 tipos de ativo e nenhum tipo acima de 60%.
- Venda com prejuizo simulado: estruturada para disparar quando evento de venda trouxer `unitPriceCents` menor que `averagePriceCents`.

## Regras planejadas

- Excesso de caixa por tempo prolongado, dependente de historico temporal.
- Explicacao de missao antes de iniciar a missao.
- Parabens por conclusao de missao educativa, conectado ao catalogo de missoes.
- Feedback visual da Cidade Fortuna por comportamento financeiro saudavel.
- Dicas fixas por tela com controle persistente de exibicao.

## Endpoints

Implementados:

- `GET /mentor/tips/player/{playerId}`
- `POST /mentor/evaluate/player/{playerId}`

Planejados apos persistencia de dicas:

- `POST /mentor/tips/{tipId}/seen`
- `POST /mentor/tips/{tipId}/dismiss`

## Logs e rastreabilidade

O servico registra, quando recebe `LoggerPort`:

- regra avaliada;
- regra disparada;
- regra nao disparada por condicao;
- regra bloqueada por cooldown;
- regra bloqueada por limite de repeticao;
- contexto resumido sem dados sensiveis.

## Testes

Criados em `packages/application/test/RuleBasedMentorService.test.ts`:

- disparo por primeira compra;
- disparo por renda fixa, FII e acao;
- primeiro rendimento;
- venda abaixo do preco medio quando o evento traz metadata;
- ausencia de reserva;
- carteira concentrada;
- excesso de caixa;
- diversificacao alcancada;
- cooldown e limite de repeticao;
- limite de dicas por avaliacao;
- use case;
- bloqueio de padroes proibidos de promessa, aposta ou recomendacao real.

## Cuidados educativos e legais

As mensagens devem:

- reforcar que o ambiente e uma simulacao educativa quando necessario;
- explicar risco de forma clara;
- evitar promessa de ganho;
- evitar comandos como comprar, vender ou investir em ativo especifico;
- evitar linguagem de aposta, cassino ou oportunidade imperdivel;
- tratar prejuizo e oscilacao como aprendizado, nao punicao.

## Evolucao futura com IA

Uma futura IA generativa deve ficar atras de uma interface separada, com o motor deterministico como padrao. Antes de habilitar IA, o projeto deve exigir consentimento explicito, filtros de seguranca, auditoria de prompts/respostas, bloqueio de recomendacao personalizada real, explicacao de limites e fallback deterministico.
