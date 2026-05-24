import type { MoneyCents } from "./finance.js";

export type Asset = {
  id: string;
  symbol: string;
  name: string;
  type: string;
  currentPriceCents: MoneyCents;
  previousPriceCents?: MoneyCents;
  variationBps: number;
  riskLevel: string;
  liquidity: string;
  expectedYieldDescription?: string;
  expectedYieldCents?: MoneyCents;
  expectedYieldRateBps?: number;
  description: string;
  longDescription?: string;
  riskExplanation?: string;
  liquidityExplanation?: string;
  mentorHint?: string;
  isActive: boolean;
  isMocked: boolean;
  updatedAt: string;
};

export type AssetPrice = {
  assetId: string;
  symbol: string;
  priceCents: MoneyCents;
  updatedAt: string;
};

export type AssetYield = {
  assetId: string;
  symbol: string;
  hasYield: boolean;
  yieldType: string | null;
  lastYieldCents: MoneyCents;
  nextPaymentDate: string | null;
};
