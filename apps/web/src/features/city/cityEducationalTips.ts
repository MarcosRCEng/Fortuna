import type { PlayerMission } from "../../services/missionApi.js";
import type { Transaction } from "../../types/transaction.js";
import type { DeriveCityInput } from "./city.types.js";

export type EducationalTip = {
  id: string;
  title: string;
  description: string;
  category: "wallet" | "portfolio" | "mission" | "income" | "risk" | "city";
  severity?: "info" | "success" | "warning";
  actionLabel?: string;
  actionHref?: string;
};

export type CityEducationalTipContext = {
  input: DeriveCityInput;
  missions: PlayerMission[];
  transactions: Transaction[];
};

export function createCityEducationalTips({
  input,
  missions,
  transactions,
}: CityEducationalTipContext): EducationalTip[] {
  const tips: EducationalTip[] = [];
  const openMission = missions.find(
    (mission) =>
      mission.status === "IN_PROGRESS" || mission.status === "AVAILABLE",
  );
  const hasPortfolioMovement = transactions.some((transaction) =>
    ["BUY", "SELL", "INCOME", "INCOME_COLLECTED"].includes(transaction.type),
  );

  if (input.collectibleIncomeCents > 0) {
    tips.push({
      id: "collect-simulated-income",
      title: "Colete um rendimento simulado",
      description:
        "Use a coleta educativa para observar como o saldo e o historico registram esse fluxo no jogo.",
      category: "income",
      severity: "success",
      actionLabel: "Ver missoes",
      actionHref: "/missions",
    });
  }

  if (input.hasConcentrationWarning) {
    tips.push({
      id: "review-concentration-risk",
      title: "Compare sua diversificacao",
      description:
        "Antes de concentrar muitos recursos simulados em um unico ativo, confira a composicao da carteira.",
      category: "risk",
      severity: "warning",
      actionLabel: "Ver carteira",
      actionHref: "/wallet",
    });
  }

  if (openMission) {
    tips.push({
      id: `mission-${openMission.id}`,
      title:
        openMission.status === "IN_PROGRESS"
          ? "Conclua uma missao educativa"
          : "Escolha uma missao educativa",
      description:
        openMission.status === "IN_PROGRESS"
          ? openMission.objective
          : "Use missoes para aplicar conceitos e evoluir sua cidade no ambiente educativo.",
      category: "mission",
      severity: "info",
      actionLabel: "Abrir missoes",
      actionHref: "/missions",
    });
  }

  if (input.availableBalanceCents > 0 || input.totalEquityCents === 0) {
    tips.push({
      id: "start-with-simulated-reserve",
      title: "Comece pela reserva simulada",
      description:
        "Antes de buscar diversificacao no jogo, observe quanto permanece em saldo e como isso aparece no resumo.",
      category: "wallet",
      severity: "info",
      actionLabel: "Ver carteira",
      actionHref: "/wallet",
    });
  }

  if (input.positionsCount === 0) {
    tips.push({
      id: "buy-first-simulated-asset",
      title: "Compre um ativo simulado",
      description:
        "Registre uma compra pequena no ambiente educativo para entender como uma posicao aparece na carteira.",
      category: "portfolio",
      severity: "info",
      actionLabel: "Abrir mercado",
      actionHref: "/market",
    });
  } else if (!input.hasConcentrationWarning) {
    tips.push({
      id: "compare-diversification-before-next-step",
      title: "Compare sua diversificacao",
      description:
        "Veja se caixa, classes de ativos e posicoes estao distribuidos antes de simular novos aportes.",
      category: "portfolio",
      severity: "info",
      actionLabel: "Ver carteira",
      actionHref: "/wallet",
    });
  }

  if (hasPortfolioMovement) {
    tips.push({
      id: "review-transaction-history",
      title: "Revise o historico",
      description:
        "Leia cada movimentacao registrada para entender como compras, vendas e rendimentos afetam a carteira simulada.",
      category: "wallet",
      severity: "info",
      actionLabel: "Abrir historico",
      actionHref: "/history",
    });
  }

  if (tips.length === 0) {
    tips.push({
      id: "read-city-as-guide",
      title: "Use a cidade como guia",
      description:
        "Abra os predios e cards para encontrar proximas leituras educativas sem alterar as regras financeiras.",
      category: "city",
      severity: "info",
    });
  }

  return tips;
}
