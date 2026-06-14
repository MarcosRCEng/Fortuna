# Tendencia educacional do Fortuna

Versao da metodologia: `educational-trend-v1`

## Objetivo

A Tendencia educacional do Fortuna resume sinais observaveis de um ativo para
apoiar aprendizado dentro do jogo. Ela nao e recomendacao financeira, nao preve
desempenho futuro e nao usa IA generativa.

## Entradas

O motor recebe:

- simbolo do ativo;
- tipo do ativo;
- preco atual em centavos inteiros;
- historico de fechamentos em centavos inteiros;
- variacao diaria quando disponivel;
- volume e media de volume quando disponiveis;
- contexto da carteira simulada do jogador;
- data de referencia dos dados;
- indicador de dado atrasado, cacheado ou em fallback.

Valores monetarios permanecem sempre em centavos inteiros.

## Pontuacao

O score final fica entre `-100` e `100`.

Componentes de `educational-trend-v1`:

- Comportamento recente do preco: retorno da janela curta, ate 30 pontos.
- Distancia entre medias: media curta contra media longa disponivel, ate 25 pontos.
- Variacao de um dia: movimento diario informado, ate 10 pontos.
- Volatilidade: oscilacao diaria recente; volatilidade alta reduz o score.
- Volume: usado apenas quando volume atual e media recente existem.
- Carteira: presenca e concentracao aparecem como fatores educativos separados.
- Qualidade dos dados: poucos pontos, atraso ou falta de campos reduzem confianca.

Concentracao nao altera automaticamente a leitura de preco. Ela gera alerta
educativo de diversificacao.

## Faixas

- `MOMENTO_MUITO_POSITIVO`: score maior ou igual a `50`.
- `MOMENTO_POSITIVO`: score entre `25` e `49`.
- `MOMENTO_NEUTRO`: score entre `-24` e `24`.
- `MOMENTO_NEGATIVO`: score entre `-49` e `-25`.
- `MOMENTO_MUITO_NEGATIVO`: score menor ou igual a `-50`.
- `DADOS_INSUFICIENTES`: preco atual ausente ou historico com menos de 5 pontos.

## Exemplos

Exemplo positivo moderado:

- fechamentos sobem de 1000 para 1348 centavos em 30 pontos;
- variacao diaria informada de `+1,20%`;
- volume confiavel disponivel;
- score esperado na faixa positiva.

Exemplo neutro:

- fechamentos alternam perto de 1000 centavos;
- medias curta e longa ficam proximas;
- variacao diaria perto de zero;
- score esperado na faixa neutra.

Exemplo de dados insuficientes:

- preco atual ausente ou apenas 2 fechamentos;
- classificacao `DADOS_INSUFICIENTES`;
- confianca `LOW`;
- nenhum score direcional e inferido.

## Limitacoes

- O motor nao usa dados futuros.
- O motor nao usa dados Pro de FIIs quando a capability esta desabilitada.
- O motor nao usa dados de analistas, metas externas ou scraping.
- O motor depende da qualidade dos providers, cache e fallback configurados.
- O resultado e uma leitura educacional do momento dos dados disponiveis.

## UI e Mentor

Na tela de Mercados, o card do Mentor mostra:

- classificacao textual permitida: Muito negativo, Negativo, Neutro, Positivo,
  Muito positivo ou Dados insuficientes;
- score em escala visual negativa-neutra-positiva, sempre com texto e marcador;
- confianca, data dos dados, fatores positivos, neutros e de atencao;
- alertas de concentracao e dados;
- explicacao expansivel de metodologia;
- versao da metodologia e disclaimer.

Na aba Minha lista, tendencias sao carregadas sob demanda para o lote visivel
limitado pelo backend. Na aba Minha carteira, o card adiciona contexto
educacional de concentracao e separa tendencia de preco de diversificacao.

O Mentor registra mensagens deterministicas quando tendencias sao consultadas.
O registro inclui jogador, simbolo, versao da metodologia, classificacao, data
de referencia e template usado. O registro nao armazena payload bruto do
provider externo.

## Glossario

- Fechamento: preco final de um periodo no historico recebido.
- Media curta: media dos ultimos 5 fechamentos.
- Media longa: media dos ultimos ate 20 fechamentos disponiveis.
- Volatilidade: dispersao dos retornos diarios em basis points.
- Basis point: centesimo de ponto percentual; `100 bps = 1%`.
- Confianca: qualidade operacional do calculo, nao chance de acerto.

## Versionamento

Toda resposta informa `methodologyVersion`. Mudancas em pesos, janelas,
limiares ou fatores devem criar nova versao, por exemplo
`educational-trend-v2`.

Resultados nao devem ser persistidos como verdade permanente sem data de
referencia e versao da metodologia.

## Politica de alteracao

Alteracoes exigem:

- testes de fronteira das faixas;
- fixtures deterministicas;
- validacao de termos proibidos no texto do recurso;
- atualizacao deste documento;
- registro da nova versao quando houver mudanca metodologica.

## Disclaimer

Conteudo educacional. Nao e recomendacao financeira, nao preve desempenho
futuro, dados podem estar atrasados e decisoes reais exigem avaliacao propria.
