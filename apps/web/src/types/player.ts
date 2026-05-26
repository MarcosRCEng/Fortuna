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
  mentorMessage: MentorMessage | null;
};

export type MentorMessage = {
  id: string;
  playerId: string;
  type: string;
  trigger: string;
  title: string;
  message: string;
  educationalConcept?: string;
  severity: "positive" | "info" | "warning" | "critical_educational";
  relatedEntityType?: string;
  relatedEntityId?: string;
  metadata?: Record<string, string | number | boolean | null>;
  createdAt: string;
  readAt: string | null;
};
