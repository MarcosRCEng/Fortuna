export function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function transactionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    ADJUSTMENT: "Ajuste de carteira",
    ASSET_DETAILS_VIEWED: "Detalhes estudados",
    ASSET_PURCHASED: "Compra realizada",
    ASSET_SOLD: "Venda realizada",
    BUY: "Compra",
    BUY_ORDER_EXECUTED: "Compra realizada",
    CITY_DISTRICT_UNLOCKED: "Distrito desbloqueado",
    CONCENTRATION_ALERT_TRIGGERED: "Alerta de concentracao",
    EDUCATIONAL_BADGE_GRANTED: "Conquista educativa",
    EMERGENCY_RESERVE_COMPLETED: "Reserva fortalecida",
    EMERGENCY_RESERVE_STARTED: "Reserva iniciada",
    EXCESSIVE_CONCENTRATION_DETECTED: "Concentracao elevada",
    FIRST_BUY: "Primeira compra",
    FIRST_DIVERSIFICATION: "Primeira diversificacao",
    FIRST_INCOME_COLLECTED: "Primeiro rendimento",
    FIRST_INCOME_RECEIVED: "Primeiro rendimento",
    FIRST_SELL: "Primeira venda",
    SELL: "Venda",
    SELL_ORDER_EXECUTED: "Venda realizada",
    INCOME: "Rendimento",
    INCOME_COLLECTED: "Rendimento coletado",
    INITIAL_DEPOSIT: "Deposito inicial",
    MARKET_EVENT: "Mercado",
    MARKET_CYCLE_ADVANCED: "Ciclo de mercado",
    MARKET_PRICES_REFRESHED: "Mercado atualizado",
    MISSION: "Missao",
    MISSION_COMPLETED: "Missao concluida",
    MISSION_REWARD_APPLIED: "Recompensa aplicada",
    MISSION_REWARD_CLAIMED: "Recompensa resgatada",
    MENTOR_TIP_READ: "Mentor lido",
    NET_WORTH_REACHED: "Marco de patrimonio",
    NEW_ASSET_CLASS_UNLOCKED: "Nova classe liberada",
    NEW_DISTRICT_UNLOCKED: "Novo distrito",
    NEW_TOOL_UNLOCKED: "Nova ferramenta",
    PLAYER_CREATED: "Jogador criado",
    PLAYER_LEVEL_UP: "Nivel alcancado",
    PORTFOLIO_UPDATED: "Carteira recalculada",
    REPORT_VIEWED: "Relatorio visto",
    RISK_EDUCATION_VIEWED: "Risco estudado",
    TRANSACTION_HISTORY_VIEWED: "Historico consultado",
  };
  return labels[type] ?? humanizeTechnicalCode(type);
}

export function humanizeTechnicalCode(code: string): string {
  return code
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((word, index) =>
      index === 0 ? capitalize(word) : word,
    )
    .join(" ");
}

function capitalize(value: string): string {
  return value.length === 0
    ? value
    : `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}
