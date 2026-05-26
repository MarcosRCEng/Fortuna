export const FORTUNA_CURRENCY = "FORTUNA";

export interface MoneyResponse {
  amountCents: number;
  currency: typeof FORTUNA_CURRENCY;
  formatted: string;
}

export function formatFortuna(cents: number): string {
  const safeCents = Number.isSafeInteger(cents) ? cents : 0;
  const sign = safeCents < 0 ? "-" : "";
  const absolute = Math.abs(safeCents);
  const whole = Math.trunc(absolute / 100);
  const fraction = absolute % 100;
  const wholeFormatted = whole.toLocaleString("pt-BR");
  return `${sign}F$ ${wholeFormatted},${fraction.toString().padStart(2, "0")}`;
}

export function toMoneyResponse(cents: number): MoneyResponse {
  return {
    amountCents: cents,
    currency: FORTUNA_CURRENCY,
    formatted: formatFortuna(cents),
  };
}

export function formatBasisPoints(basisPoints: number): string {
  const sign = basisPoints < 0 ? "-" : "";
  const absolute = Math.abs(basisPoints);
  const whole = Math.trunc(absolute / 100);
  const fraction = absolute % 100;
  return `${sign}${whole},${fraction.toString().padStart(2, "0")}%`;
}
