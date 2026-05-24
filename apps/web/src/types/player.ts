import type { ApiMoney, MoneyCents } from "./finance.js";

export type Player = {
  id: string;
  name: string;
  nickname?: string;
  wallet: ApiMoney;
  createdAt: string;
};

export type PlayerSummary = {
  playerId: string;
  availableCashCents: MoneyCents;
  totalInvestedCents: MoneyCents;
  portfolioMarketValueCents: MoneyCents;
  totalEquityCents: MoneyCents;
  totalIncomeCollectedCents: MoneyCents;
  totalTransactions: number;
  collectibleIncomeCents: MoneyCents | null;
  level: number;
  progressPercent: number;
  mentorTip: string;
};
