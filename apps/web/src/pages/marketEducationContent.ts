import type { MarketAssetType } from "../types/market.js";

export type MarketAssetEducationSectionKey =
  | "whatItIs"
  | "howItWorks"
  | "commonReturns"
  | "typicalRisks"
  | "liquidity"
  | "watchPoints";

export type MarketAssetEducationSection = {
  key: MarketAssetEducationSectionKey;
  title: string;
  body: string;
};

export type MarketAssetEducationContent = {
  type: Exclude<MarketAssetType, "TREASURY" | "UNKNOWN">;
  label: string;
  summary: string;
  sections: MarketAssetEducationSection[];
};

export const marketEducationSectionTitles: Record<
  MarketAssetEducationSectionKey,
  string
> = {
  whatItIs: "O que e",
  howItWorks: "Como funciona",
  commonReturns: "Formas comuns de retorno",
  typicalRisks: "Riscos tipicos",
  liquidity: "Liquidez",
  watchPoints: "Pontos a observar",
};

const marketAssetEducationContent: Record<
  MarketAssetEducationContent["type"],
  MarketAssetEducationContent
> = {
  STOCK: education("STOCK", "Acao", [
    ["whatItIs", "Representa uma participacao em uma companhia listada em bolsa."],
    ["howItWorks", "O preco varia conforme negocios no mercado, resultados da empresa, expectativas e condicoes economicas."],
    ["commonReturns", "Pode haver ganho ou perda na venda e, em alguns casos, distribuicao de dividendos ou juros sobre capital proprio."],
    ["typicalRisks", "Oscilacao de preco, desempenho operacional da empresa, governanca, setor, endividamento e eventos especificos."],
    ["liquidity", "A liquidez depende do volume negociado; acoes mais negociadas costumam ter execucao mais simples que papeis pouco movimentados."],
    ["watchPoints", "Observe resultados, comunicados, concentracao na carteira, setor, volume e se a variacao recente combina com seu objetivo no simulador."],
  ]),
  UNIT: education("UNIT", "Unit", [
    ["whatItIs", "E um pacote negociado na bolsa que reune diferentes valores mobiliarios de uma mesma companhia."],
    ["howItWorks", "A composicao pode combinar acoes ordinarias, preferenciais ou recibos; o ticker da unit negocia o conjunto de uma vez."],
    ["commonReturns", "O retorno pode vir da variacao de preco da unit e de eventuais proventos dos ativos que formam o pacote."],
    ["typicalRisks", "Inclui riscos da companhia emissora, da composicao da unit, de governanca, de preco e de volume negociado."],
    ["liquidity", "Pode ser menor ou maior que a dos papeis separados, conforme interesse do mercado e quantidade de negocios diarios."],
    ["watchPoints", "Confira a composicao da unit, direitos de cada papel, eventos societarios e se o ticker tem volume suficiente para a simulacao."],
  ]),
  FII: education("FII", "FII", [
    ["whatItIs", "E um fundo imobiliario listado que reune cotistas para investir em imoveis, recebiveis ou estrategias ligadas ao setor imobiliario."],
    ["howItWorks", "As cotas sao negociadas em bolsa e a gestao do fundo segue regulamento proprio, com patrimonio separado dos cotistas."],
    ["commonReturns", "Pode gerar variacao no preco da cota e distribuicoes periodicas quando ha resultado disponivel conforme as regras do fundo."],
    ["typicalRisks", "Vacancia, inadimplencia, qualidade dos ativos, concentracao de inquilinos, juros, gestao e marcacao a mercado."],
    ["liquidity", "A liquidez depende do numero de cotistas, volume em bolsa e tamanho do fundo; alguns fundos negociam pouco."],
    ["watchPoints", "Observe relatorios gerenciais, segmento, diversificacao de ativos, despesas, distribuicoes recorrentes e riscos do imovel ou recebivel."],
  ]),
  ETF: education("ETF", "ETF", [
    ["whatItIs", "E um fundo listado que busca acompanhar uma carteira, indice ou estrategia definida em regulamento."],
    ["howItWorks", "A cota negocia em bolsa e o gestor ajusta a carteira para seguir a referencia informada pelo fundo."],
    ["commonReturns", "O retorno acompanha a variacao da carteira de referencia, descontados custos e eventuais diferencas de acompanhamento."],
    ["typicalRisks", "Risco da classe acompanhada, erro de acompanhamento, baixa liquidez, custos, cambio quando houver exposicao externa e regras do indice."],
    ["liquidity", "Depende do volume em bolsa e da atuacao de formadores de mercado; spreads podem variar ao longo do dia."],
    ["watchPoints", "Observe indice de referencia, taxa, composicao, exposicao setorial, historico de acompanhamento e volume negociado."],
  ]),
  BDR: education("BDR", "BDR", [
    ["whatItIs", "E um recibo negociado no Brasil que representa exposicao a ativo emitido no exterior."],
    ["howItWorks", "O recibo local acompanha o ativo lastro fora do pais, com efeitos de preco do ativo, cambio e regras do programa."],
    ["commonReturns", "Pode haver variacao do recibo em reais e repasse de eventos do ativo lastro quando aplicavel."],
    ["typicalRisks", "Risco da empresa ou fundo no exterior, variacao cambial, diferencas regulatorias, liquidez local e horario de mercado."],
    ["liquidity", "A liquidez depende do interesse no recibo na B3 e pode diferir da liquidez do ativo negociado fora do Brasil."],
    ["watchPoints", "Observe ativo lastro, moeda de exposicao, informacoes internacionais, eventos corporativos e diferenca entre preco local e exterior."],
  ]),
  FI_INFRA: education("FI_INFRA", "FI-Infra", [
    ["whatItIs", "E um fundo listado voltado a ativos de infraestrutura, como debentures incentivadas e instrumentos ligados a projetos do setor."],
    ["howItWorks", "O fundo compra ativos de credito ou participacoes relacionadas a infraestrutura e suas cotas negociam em bolsa."],
    ["commonReturns", "Pode gerar distribuicoes de resultado e variacao no preco da cota conforme juros, credito, prazos e percepcao de risco."],
    ["typicalRisks", "Risco de credito, duration, juros, inflacao, concentracao em emissores ou projetos, liquidez e mudancas regulatorias."],
    ["liquidity", "A negociacao em bolsa pode ser limitada; cotas com menor volume podem ter spreads maiores."],
    ["watchPoints", "Observe carteira de ativos, rating quando houver, vencimentos, indexadores, concentracao, relatorios e politica de distribuicao."],
  ]),
  FI_AGRO: education("FI_AGRO", "FI-Agro", [
    ["whatItIs", "E um fundo listado que investe em ativos ligados ao agronegocio, como recebiveis, imoveis rurais ou participacoes do setor."],
    ["howItWorks", "A estrategia e definida em regulamento e as cotas negociam em bolsa, refletindo carteira, credito, renda e percepcao de risco."],
    ["commonReturns", "Pode haver distribuicoes periodicas e variacao do preco da cota conforme resultados, juros e risco dos ativos do fundo."],
    ["typicalRisks", "Risco de credito, safra, clima, commodities, garantias, concentracao em devedores, liquidez e gestao."],
    ["liquidity", "Varia bastante entre fundos; alguns tem negociacao pequena e podem apresentar diferenca maior entre compra e venda."],
    ["watchPoints", "Observe devedores, garantias, segmentos do agro, indexadores, inadimplencia, relatorios e dependencia de poucos ativos."],
  ]),
  FIP: education("FIP", "FIP", [
    ["whatItIs", "E um fundo de participacoes que investe em empresas ou projetos, muitas vezes com horizonte mais longo e menor liquidez."],
    ["howItWorks", "A gestao busca acompanhar ou influenciar empresas investidas, seguindo regulamento e prazos proprios do fundo."],
    ["commonReturns", "O retorno pode vir da valorizacao das empresas investidas, venda de participacoes e distribuicoes quando houver resultado."],
    ["typicalRisks", "Baixa liquidez, avaliacao incerta das investidas, concentracao, execucao dos projetos, governanca e prazo de maturacao."],
    ["liquidity", "Mesmo quando listado, pode negociar pouco; a saida pode depender de janela de mercado e demanda por cotas."],
    ["watchPoints", "Observe prazo, carteira de investidas, regras de avaliacao, taxas, governanca, chamadas de capital e historico da gestao."],
  ]),
  FIDC: education("FIDC", "FIDC", [
    ["whatItIs", "E um fundo que investe em direitos creditorios, como recebiveis originados por empresas, comercio ou servicos."],
    ["howItWorks", "O fundo compra recebiveis e pode ter cotas com prioridades diferentes de pagamento, conforme sua estrutura."],
    ["commonReturns", "O retorno depende do recebimento dos creditos, taxas da carteira, inadimplencia, estrutura de cotas e preco negociado."],
    ["typicalRisks", "Inadimplencia, qualidade dos cedentes e sacados, subordinacao, concentracao, liquidez, estrutura juridica e servicos de cobranca."],
    ["liquidity", "Pode ser restrita, especialmente em fundos com poucos negocios ou cotas voltadas a investidores especificos."],
    ["watchPoints", "Observe carteira de recebiveis, nivel de subordinacao, inadimplencia, cedentes, auditoria, rating quando houver e regras de resgate."],
  ]),
};

export const supportedEducationAssetTypes = Object.keys(
  marketAssetEducationContent,
) as MarketAssetEducationContent["type"][];

export function getMarketAssetEducationContent(
  type: MarketAssetType,
): MarketAssetEducationContent | undefined {
  if (isSupportedEducationAssetType(type)) {
    return marketAssetEducationContent[type];
  }
  return undefined;
}

export function isSupportedEducationAssetType(
  type: MarketAssetType,
): type is MarketAssetEducationContent["type"] {
  return Object.hasOwn(marketAssetEducationContent, type);
}

function education(
  type: MarketAssetEducationContent["type"],
  label: string,
  entries: Array<[MarketAssetEducationSectionKey, string]>,
): MarketAssetEducationContent {
  return {
    type,
    label,
    summary: `Conteudo educativo sobre ${label}, com foco em funcionamento, retorno, risco, liquidez e observacao.`,
    sections: entries.map(([key, body]) => ({
      key,
      title: marketEducationSectionTitles[key],
      body,
    })),
  };
}
