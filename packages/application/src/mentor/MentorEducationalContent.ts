import { MentorEducationalConcept } from "@fortuna/domain";

export interface MentorConceptContent {
  title: string;
  message: string;
}

export const MENTOR_CONCEPT_CONTENT: Record<
  MentorEducationalConcept,
  MentorConceptContent
> = {
  [MentorEducationalConcept.RISK]: {
    title: "Risco",
    message:
      "Risco e a chance de um resultado ser diferente do esperado. No jogo, ele ajuda a entender por que investimentos simulados podem oscilar e por que nenhuma rentabilidade deve ser tratada como garantida.",
  },
  [MentorEducationalConcept.LIQUIDITY]: {
    title: "Liquidez",
    message:
      "Liquidez indica o quao facil e transformar um investimento em dinheiro disponivel. Ativos mais liquidos ajudam na flexibilidade, mas isso nao elimina outros riscos.",
  },
  [MentorEducationalConcept.FIXED_INCOME]: {
    title: "Renda fixa",
    message:
      "Renda fixa simula investimentos com regras mais previsiveis, como juros e prazos. Mesmo assim, e importante observar liquidez, vencimento e risco antes de comparar alternativas.",
  },
  [MentorEducationalConcept.FII]: {
    title: "FIIs",
    message:
      "FIIs sao fundos imobiliarios simulados. Eles podem distribuir rendimentos, mas seus precos tambem oscilam e os rendimentos nao sao garantidos.",
  },
  [MentorEducationalConcept.STOCKS]: {
    title: "Acoes",
    message:
      "Acoes representam uma participacao simulada em empresas. Elas podem valorizar ou cair bastante, por isso ajudam a estudar volatilidade e risco de mercado.",
  },
  [MentorEducationalConcept.DIVIDENDS]: {
    title: "Dividendos",
    message:
      "Dividendos e proventos sao distribuicoes que alguns ativos podem pagar. No Fortuna eles sao educativos e simulados, e nao devem ser vistos como renda garantida.",
  },
  [MentorEducationalConcept.INTEREST]: {
    title: "Juros",
    message:
      "Juros mostram como um valor pode crescer ao longo do tempo em certas regras simuladas. Eles dependem das condicoes do ativo e nao significam ganho garantido.",
  },
  [MentorEducationalConcept.AVERAGE_PRICE]: {
    title: "Preco medio",
    message:
      "Preco medio e o custo medio das compras de um ativo. Ele ajuda a comparar o valor pago com o valor atual, mas nao decide sozinho se uma venda faz sentido.",
  },
  [MentorEducationalConcept.VOLATILITY]: {
    title: "Volatilidade",
    message:
      "Volatilidade e a intensidade das oscilacoes de preco. Quanto maior ela e, mais o valor pode mudar no curto prazo, para cima ou para baixo.",
  },
  [MentorEducationalConcept.DIVERSIFICATION]: {
    title: "Diversificacao",
    message:
      "Diversificacao e distribuir a carteira entre ativos ou tipos diferentes. Ela nao elimina risco, mas reduz a dependencia de um unico resultado.",
  },
  [MentorEducationalConcept.EMERGENCY_RESERVE]: {
    title: "Reserva de emergencia",
    message:
      "Reserva de emergencia e uma parte do dinheiro mantida com alta liquidez. No jogo, ela representa uma base antes de assumir riscos maiores.",
  },
};

export const FORBIDDEN_MENTOR_MESSAGE_PATTERNS = [
  /\bcompre\b/i,
  /\bvenda agora\b/i,
  /\binvista neste ativo\b/i,
  /\bgarantid[ao]\b/i,
  /\baposte\b/i,
  /\bjackpot\b/i,
  /\ball[- ]in\b/i,
  /\bmelhor oportunidade\b/i,
  /\bvai render\b/i,
];
