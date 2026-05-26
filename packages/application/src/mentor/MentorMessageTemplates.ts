import {
  MentorMessageSeverity,
  MentorMessageTrigger,
  MentorMessageType,
} from "@fortuna/domain";

export interface MentorMessageTemplate {
  type: MentorMessageType;
  trigger: MentorMessageTrigger;
  title: string;
  message: string;
  educationalConcept: string;
  severity: MentorMessageSeverity;
}

export const mentorTemplates = {
  firstPurchase: {
    type: MentorMessageType.CONGRATULATIONS,
    trigger: MentorMessageTrigger.FIRST_PURCHASE,
    title: "Primeiro passo dado",
    message:
      "Voce fez sua primeira compra simulada. Agora comeca a parte mais importante: acompanhar como esse ativo se comporta dentro da sua carteira e entender os riscos envolvidos.",
    educationalConcept: "primeiro investimento",
    severity: MentorMessageSeverity.POSITIVE,
  },
  concentratedPurchase: {
    type: MentorMessageType.EDUCATIONAL_ALERT,
    trigger: MentorMessageTrigger.CONCENTRATED_PURCHASE,
    title: "Atencao a concentracao",
    message:
      "Uma parte grande da sua carteira esta em um unico ativo. Concentracao aumenta a dependencia do comportamento dele; observe como diversificacao pode mudar esse risco na simulacao.",
    educationalConcept: "diversificacao",
    severity: MentorMessageSeverity.WARNING,
  },
  portfolioWithoutDiversification: {
    type: MentorMessageType.ORIENTATION,
    trigger: MentorMessageTrigger.PORTFOLIO_WITHOUT_DIVERSIFICATION,
    title: "Carteira ainda pouco diversificada",
    message:
      "Sua carteira simulada depende de apenas um ativo ou de um unico tipo de ativo. Diversificacao ajuda a reduzir dependencia de um unico comportamento e pode render uma boa missao educativa.",
    educationalConcept: "diversificacao",
    severity: MentorMessageSeverity.INFO,
  },
  saleWithLoss: {
    type: MentorMessageType.RISK_REFLECTION,
    trigger: MentorMessageTrigger.SALE_WITH_LOSS,
    title: "Venda com perda simulada",
    message:
      "Esta venda ocorreu abaixo do preco medio ou valor de referencia. Perdas fazem parte da simulacao; registre o motivo da decisao e compare com o que voce esperava aprender.",
    educationalConcept: "preco medio",
    severity: MentorMessageSeverity.WARNING,
  },
  saleWithGain: {
    type: MentorMessageType.CONGRATULATIONS,
    trigger: MentorMessageTrigger.SALE_WITH_GAIN,
    title: "Ganho realizado com cautela",
    message:
      "Voce realizou uma venda acima do preco medio ou valor de referencia. Vale registrar o aprendizado, lembrando que ganho passado na simulacao nao indica ganho futuro.",
    educationalConcept: "ganho realizado",
    severity: MentorMessageSeverity.POSITIVE,
  },
  idleCashExcess: {
    type: MentorMessageType.ORIENTATION,
    trigger: MentorMessageTrigger.IDLE_CASH_EXCESS,
    title: "Saldo disponivel elevado",
    message:
      "Saldo disponivel traz liquidez e flexibilidade. Quando ele fica muito alto em relacao ao patrimonio, pode ser uma oportunidade de estudar reserva de liquidez, prazos e objetivos simulados.",
    educationalConcept: "liquidez",
    severity: MentorMessageSeverity.INFO,
  },
  availableIncome: {
    type: MentorMessageType.ORIENTATION,
    trigger: MentorMessageTrigger.AVAILABLE_INCOME,
    title: "Rendimento disponivel",
    message:
      "Voce tem rendimento disponivel para coletar. Ao coletar, observe como isso aparece no historico e como altera o saldo da carteira simulada.",
    educationalConcept: "rendimento",
    severity: MentorMessageSeverity.INFO,
  },
  missionCompleted: {
    type: MentorMessageType.CONGRATULATIONS,
    trigger: MentorMessageTrigger.MISSION_COMPLETED,
    title: "Missao concluida",
    message:
      "Voce concluiu uma etapa educativa. Repare no conceito praticado nessa missao e avance aos poucos para consolidar o aprendizado.",
    educationalConcept: "aprendizado progressivo",
    severity: MentorMessageSeverity.POSITIVE,
  },
  riskyAssetViewed: {
    type: MentorMessageType.RISK_REFLECTION,
    trigger: MentorMessageTrigger.RISKY_ASSET_VIEWED,
    title: "Risco alto em estudo",
    message:
      "Este ativo tem risco alto na simulacao. Antes de agir, observe volatilidade, incerteza e adequacao ao seu perfil simulado; o objetivo aqui e aprender com contexto.",
    educationalConcept: "risco",
    severity: MentorMessageSeverity.WARNING,
  },
} satisfies Record<string, MentorMessageTemplate>;

export const FORBIDDEN_MENTOR_TEMPLATE_PATTERNS = [
  /lucro garantido/i,
  /ganho garantido/i,
  /retorno garantido/i,
  /compre este ativo/i,
  /venda este ativo/i,
  /voce vai ganhar/i,
  /certeza de lucro/i,
  /melhor investimento/i,
  /aposta/i,
  /cassino/i,
  /fique rico/i,
  /dinheiro facil/i,
];

export function validateMentorTemplateText(): void {
  for (const template of Object.values(mentorTemplates)) {
    for (const pattern of FORBIDDEN_MENTOR_TEMPLATE_PATTERNS) {
      if (pattern.test(template.title) || pattern.test(template.message)) {
        throw new Error(
          `Mentor template ${template.trigger} contains forbidden language.`,
        );
      }
    }
  }
}
