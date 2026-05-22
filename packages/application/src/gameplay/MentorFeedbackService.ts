import type { GameEvent } from "@fortuna/domain";
import type { MentorFeedback } from "./GameplaySnapshots.js";

export class MentorFeedbackService {
  fromEvents(events: GameEvent[]): MentorFeedback[] {
    return events
      .map((event) => this.fromEvent(event))
      .filter((feedback): feedback is MentorFeedback => Boolean(feedback));
  }

  private fromEvent(event: GameEvent): MentorFeedback | undefined {
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
