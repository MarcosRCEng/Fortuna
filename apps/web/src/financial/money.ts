export type Cents = number;

export function assertIntegerCents(value: number, fieldName: string): Cents {
  if (!Number.isInteger(value)) {
    throw new Error(`${fieldName} must be an integer amount in cents.`);
  }

  return value;
}

export function formatMoney(cents: Cents): string {
  assertIntegerCents(cents, "cents");

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export function formatFortuna(cents: Cents): string {
  assertIntegerCents(cents, "cents");
  return `${cents.toLocaleString("pt-BR")} moedas Fortuna`;
}

export function parseWholeQuantity(input: string): number {
  const normalized = input.trim();
  if (!/^\d+$/.test(normalized)) {
    return 0;
  }

  return Number.parseInt(normalized, 10);
}

export function calculateTradeTotalCents(
  priceCents: Cents,
  quantity: number,
): Cents {
  assertIntegerCents(priceCents, "priceCents");
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new Error("quantity must be a non-negative integer.");
  }

  return priceCents * quantity;
}

export function calculateBalanceAfterBuy(
  balanceCents: Cents,
  totalCents: Cents,
): Cents {
  assertIntegerCents(balanceCents, "balanceCents");
  assertIntegerCents(totalCents, "totalCents");
  return balanceCents - totalCents;
}

export function calculateBalanceAfterSell(
  balanceCents: Cents,
  totalCents: Cents,
): Cents {
  assertIntegerCents(balanceCents, "balanceCents");
  assertIntegerCents(totalCents, "totalCents");
  return balanceCents + totalCents;
}

export function formatBasisPoints(bps: number): string {
  if (!Number.isInteger(bps)) {
    throw new Error("bps must be an integer.");
  }

  const sign = bps > 0 ? "+" : "";
  return `${sign}${(bps / 100).toLocaleString("pt-BR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}%`;
}
