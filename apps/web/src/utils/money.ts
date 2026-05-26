import type { MoneyCents } from "../types/finance.js";

export function formatMoneyFromCents(valueCents: MoneyCents): string {
  const safeValue = Number.isInteger(valueCents) ? valueCents : 0;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(safeValue / 100);
}

export function formatFortunaCoins(valueCents: MoneyCents): string {
  const safeValue = Number.isInteger(valueCents) ? valueCents : 0;
  return `${safeValue.toLocaleString("pt-BR")} moedas Fortuna`;
}

export function parsePositiveWholeQuantity(value: string): number {
  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) {
    return 0;
  }
  return Number.parseInt(normalized, 10);
}

export function calculateOrderTotalCents(
  unitPriceCents: MoneyCents,
  quantity: number,
): MoneyCents {
  if (!Number.isInteger(unitPriceCents) || !Number.isInteger(quantity)) {
    return 0;
  }
  return unitPriceCents * quantity;
}

export function formatBasisPoints(value: number): string {
  if (!Number.isInteger(value)) {
    return "0,00%";
  }
  const sign = value > 0 ? "+" : "";
  return `${sign}${(value / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}
