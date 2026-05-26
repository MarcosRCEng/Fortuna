import type { GameEvent } from "@fortuna/domain";
import type { MentorFeedback } from "./GameplaySnapshots.js";

export class MentorFeedbackService {
  fromEvents(events: GameEvent[]): MentorFeedback[] {
    return events
      .map((event) => this.fromEvent(event))
      .filter((feedback): feedback is MentorFeedback => Boolean(feedback));
  }

  private fromEvent(event: GameEvent): MentorFeedback | undefined {
    if (event.type === "MISSION_COMPLETED") {
      const missionCode = String(event.metadata?.missionCode ?? "");
      const messages: Record<
        string,
        { title: string; message: string; severity: MentorFeedback["severity"] }
      > = {
        FIRST_INVESTMENT: {
          title: "Primeiro investimento",
          message:
            "Parabens pelo primeiro investimento. Mais importante que comprar e entender o que voce comprou.",
          severity: "positive",
        },
        LIQUIDITY_RESERVE: {
          title: "Reserva de liquidez",
          message:
            "Boa escolha ao conhecer ativos com liquidez. Reserva de liquidez ajuda a lidar com imprevistos.",
          severity: "positive",
        },
        INITIAL_DIVERSIFICATION: {
          title: "Diversificacao inicial",
          message:
            "Sua carteira comecou a se diversificar. Isso reduz a dependencia de um unico tipo de ativo.",
          severity: "positive",
        },
        FIRST_INCOME_COLLECTED: {
          title: "Rendimento coletado",
          message:
            "Voce coletou rendimentos. Renda recorrente pode ajudar no crescimento ao longo do tempo, sem garantir ganho real.",
          severity: "positive",
        },
        HIGH_RISK_VIEWED: {
          title: "Risco estudado",
          message:
            "Ativos de maior risco podem oscilar mais. Antes de comprar, entenda o risco e o prazo.",
          severity: "info",
        },
        CONCENTRATION_ALERT: {
          title: "Concentracao percebida",
          message:
            "Percebi concentracao em um ativo. Isso nao e proibido, mas aumenta sua exposicao a riscos especificos.",
          severity: "warning",
        },
      };
      const found = messages[missionCode];
      if (found) {
        return {
          code: `MENTOR_MISSION_${missionCode}`,
          title: found.title,
          message: found.message,
          severity: found.severity,
          relatedEventType: event.type,
        };
      }
    }

    if (event.type === "FIRST_BUY") {
      return {
        code: "MENTOR_FIRST_BUY",
        title: "Primeiro investimento registrado",
        message:
          "Boa. Agora acompanhe o papel desse ativo na sua carteira antes de pensar em quantidade.",
        severity: "positive",
        relatedEventType: event.type,
      };
    }

    if (event.type === "FIRST_DIVERSIFICATION") {
      return {
        code: "MENTOR_DIVERSIFICATION",
        title: "Diversificacao iniciada",
        message:
          "Ter mais de um ativo ajuda a reduzir dependencia de um unico resultado. Diversificar nao elimina risco, mas melhora a leitura da carteira.",
        severity: "positive",
        relatedEventType: event.type,
      };
    }

    if (event.type === "FIRST_SELL" || event.type === "ASSET_SOLD") {
      return {
        code: event.type === "FIRST_SELL" ? "MENTOR_FIRST_SELL" : "MENTOR_SELL",
        title: "Venda registrada",
        message:
          "Vender muda sua exposicao e pode reduzir diversificacao. Use a venda para revisar risco, liquidez e prazo, sem tratar resultado passado como promessa de ganho futuro.",
        severity: "info",
        relatedEventType: event.type,
      };
    }

    if (event.type === "FIRST_INCOME_RECEIVED") {
      return {
        code: "MENTOR_INCOME",
        title: "Rendimento colhido",
        message:
          "Rendimentos sao parte do ciclo de longo prazo. Reinvestir com criterio costuma ser mais importante do que buscar ganhos rapidos.",
        severity: "positive",
        relatedEventType: event.type,
      };
    }

    if (event.type === "EMERGENCY_RESERVE_STARTED") {
      return {
        code: "MENTOR_RESERVE_STARTED",
        title: "Reserva iniciada",
        message:
          "Formar uma reserva e um passo importante antes de assumir riscos maiores.",
        severity: "positive",
        relatedEventType: event.type,
      };
    }

    if (event.type === "EXCESSIVE_CONCENTRATION_DETECTED") {
      return {
        code: "MENTOR_CONCENTRATION",
        title: "Concentracao alta detectada",
        message:
          "Uma carteira muito concentrada pode oscilar mais. Revise sua alocacao antes de aumentar exposicao.",
        severity: "warning",
        relatedEventType: event.type,
      };
    }

    if (event.type === "EMERGENCY_RESERVE_COMPLETED") {
      return {
        code: "MENTOR_RESERVE",
        title: "Reserva de emergencia completa",
        message:
          "Excelente base. Uma reserva reduz a chance de vender investimentos em momentos ruins.",
        severity: "positive",
        relatedEventType: event.type,
      };
    }

    return undefined;
  }
}
