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
    BUY: "Compra",
    SELL: "Venda",
    INCOME: "Rendimento",
    INCOME_COLLECTED: "Rendimento",
    MARKET_EVENT: "Mercado",
    MISSION: "Missao",
  };
  return labels[type] ?? type;
}
