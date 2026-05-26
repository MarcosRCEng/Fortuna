# Epic 10 - Cidade Fortuna Visual

## Direcao visual

A Cidade Fortuna do MVP usa um mapa isometrico simples em React + SVG/HTML. O estilo deve parecer uma cidade financeira organizada, educacional e confiavel: bases claras, predios geometricos, verdes institucionais, azuis de informacao, tons terrosos moderados e alertas em laranja suave.

A experiencia deve comunicar progresso gradual, diversificacao, aprendizado e maturidade financeira. Ela nao deve usar linguagem ou efeitos de cassino, jackpot, sorte, multiplicadores, chuva de moedas, fogos ou promessa de lucro.

## Distritos planejados

- Distrito Seguro / Reserva: caixa, reserva, liquidez e seguranca financeira.
- Distrito de Renda Fixa: titulos conservadores, previsibilidade e prazos.
- Distrito Imobiliario / FIIs: renda recorrente, imoveis e diversificacao patrimonial.
- Distrito Empresarial / Acoes: empresas, participacao societaria e volatilidade.
- Academia Fortuna / Educacao: missoes, conceitos aprendidos e maturidade.
- Torre do Mentor: dicas contextuais, alertas educativos e orientacao.
- Bolsa Fortuna: mercado, lista de ativos, compras, vendas e consulta de precos.
- Central de Relatorios: historico, carteira, rendimentos e indicadores.

## Distritos do MVP

O MVP prioriza Distrito Seguro, Renda Fixa, Distrito Empresarial, Academia Fortuna e Torre do Mentor. FIIs, Bolsa e Relatorios ficam previstos no layout como distritos bloqueados ou futuros.

## Mapeamento carteira -> cidade

- Saldo em caixa: desbloqueia e melhora o Distrito Seguro.
- Patrimonio total: contribui para o nivel geral da cidade.
- Quantidade de ativos e classes: define variedade de distritos e equilibrio visual.
- Renda fixa, FIIs e acoes: desbloqueiam distritos correspondentes quando a distribuicao e maior que zero.
- Rendimentos disponiveis: exibem indicador discreto de revisao, nunca premio aleatorio.
- Missoes concluidas: melhoram a Academia Fortuna.
- Maturidade financeira: melhora rotulo e organizacao percebida da cidade.
- Risco alto ou concentracao: gera alerta educativo no Mentor/Academia.
- Liquidez: aparece no conceito do Distrito Seguro e deve evoluir como proximidade/acesso no mapa.

## Estados visuais

Estados implementados: `locked`, `available`, `upgraded`, `educational_alert`, `yield_available`, `mission_available` e `mission_completed`. O contrato tambem reserva `upgrading` para progresso visual futuro.

Os estados sao derivados do snapshot financeiro e de progresso. A cidade nao altera saldo, ativos, posicoes, rendimentos ou transacoes.

## Progressao visual

- Nivel 0: cidade inicial, distritos financeiros bloqueados se nao houver saldo/ativos.
- Nivel 1: reserva e educacao aparecem como base.
- Nivel 2: renda fixa e primeiras melhorias por missoes/patrimonio.
- Nivel 3: distrito empresarial e Mentor mais contextual.
- Nivel 4: equilibrio, mais detalhes urbanos e alertas mais ricos.
- Nivel 5: cidade completa, com relatorios, mercado e distritos com identidade propria.

A progressao combina patrimonio, missoes, maturidade e diversificacao. Ela nao depende exclusivamente de patrimonio.

## Arquitetura

Implementacao atual:

- `apps/web/src/features/city/domain/cityTypes.ts`: contratos de snapshot, distrito, predio e view model.
- `apps/web/src/features/city/domain/cityRules.ts`: regras visuais derivadas.
- `apps/web/src/features/city/domain/cityViewModel.ts`: conversao de snapshot para cidade renderizavel.
- `apps/web/src/features/city/domain/citySnapshotAdapter.ts`: adaptador do `PlayerOverview` atual para `CityFinancialSnapshot`.
- `apps/web/src/features/city/data/cityLayout.ts`: layout e composicao visual.
- `apps/web/src/features/city/data/cityMockState.ts`: estado mockado.
- `apps/web/src/features/city/hooks/useCityState.ts`: memoizacao do view model.
- `apps/web/src/features/city/components/*`: renderizacao React/SVG.
- `apps/web/src/features/city/styles/city.css`: estilo isometrico e estados.

Fluxo: `financialSnapshot -> cityRules -> cityViewModel -> components`.

## Riscos de escopo

- Criar arte final complexa cedo demais.
- Misturar validacao financeira com renderizacao.
- Introduzir engine de jogo antes de validar a experiencia.
- Usar PixiJS/Phaser sem necessidade no MVP.
- Exagerar em animacoes ou efeitos de recompensa.
- Fazer rendimentos parecerem sorte, premio ou aposta.
- Criar distritos demais antes da leitura principal funcionar.

## Plano incremental

1. Estrutura visual base: feature city, tipos, mocks, regras, componente principal e mapa fixo.
2. Estados visuais: badges, detalhe de distrito, rendimento, missao e alertas.
3. Integracao: adaptar dados reais da carteira usando centavos inteiros.
4. Experiencia educativa: ampliar mensagens do Mentor e missoes por distrito.
5. Polimento: animacoes leves, responsividade, assets 2D e avaliacao futura de PixiJS.

## Como executar e validar

- `corepack pnpm --filter @fortuna/web test`
- `corepack pnpm --filter @fortuna/web lint`
- `corepack pnpm --filter @fortuna/web build`
- `corepack pnpm dev:web`

Abra a tela `Cidade` no app web. Valide se os distritos principais aparecem, se estados como alerta, rendimento e missao sao discretos, e se nenhum elemento sugere cassino, sorte ou promessa de retorno.
