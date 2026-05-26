export type MoneyCents = number;

export type ApiMoney = {
  amountCents: MoneyCents;
  currency: string;
  formatted: string;
};

export type AllocationItem = {
  assetType?: string;
  assetId?: string;
  symbol?: string;
  percentage: number;
  basisPoints: number;
  valueCents: MoneyCents;
};
