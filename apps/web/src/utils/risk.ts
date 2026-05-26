const riskLabels: Record<string, string> = {
  NONE: "Sem risco simulado",
  LOW: "Baixo risco",
  MEDIUM: "Risco moderado",
  MEDIUM_HIGH: "Risco moderado/alto",
  HIGH: "Alto risco",
};

const typeLabels: Record<string, string> = {
  CASH: "Caixa",
  FIXED_INCOME: "Renda fixa",
  FII: "FII",
  STOCK: "Acao",
};

export function riskLabel(value?: string): string {
  return riskLabels[value ?? ""] ?? value ?? "Risco nao informado";
}

export function assetTypeLabel(value?: string): string {
  return typeLabels[value ?? ""] ?? value ?? "Ativo";
}

export function riskTone(value?: string): string {
  return `risk-${(value ?? "none").toLowerCase()}`;
}
