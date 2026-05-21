export type AssetId = string;

export interface Asset {
  id: AssetId;
  symbol: string;
  name: string;
  type: "stock" | "fund" | "fixed-income" | "cash";
}
