import type { AllocationItem, MoneyCents } from "./finance.js";

export type Wallet = {
  playerId: string;
  balanceCents: MoneyCents;
  updatedAt: string;
};

export type Position = {
  assetId: string;
  symbol: string;
  name: string;
  assetType: string;
  quantity: number;
  averagePriceCents: MoneyCents;
  currentPriceCents: MoneyCents;
  investedValueCents: MoneyCents;
  currentValueCents: MoneyCents;
  unrealizedResultCents: MoneyCents;
  incomeCents?: MoneyCents;
};

export type Portfolio = {
  playerId: string;
  positions: Position[];
  totalInvestedCents: MoneyCents;
  totalMarketValueCents: MoneyCents;
};

export type PortfolioAllocation = {
  playerId: string;
  byAssetType: AllocationItem[];
  byAsset: AllocationItem[];
};
