import type { MoneyCents } from "./finance.js";

export type Transaction = {
  id: string;
  type: string;
  assetId?: string;
  assetSymbol?: string;
  quantity?: number;
  unitPriceCents?: MoneyCents;
  amountCents: MoneyCents;
  balanceAfterCents: MoneyCents;
  description: string;
  createdAt: string;
};

export type OrderExecution = {
  orderId: string;
  type: string;
  playerId: string;
  assetId: string;
  symbol: string;
  quantity: number;
  unitPriceCents: MoneyCents;
  totalCents: MoneyCents;
  walletBalanceAfterCents: MoneyCents;
  createdAt: string;
};

export type CollectIncomeResult = {
  playerId: string;
  collectedIncomeCents: MoneyCents;
  walletBalanceAfterCents: MoneyCents;
  createdAt: string;
};
