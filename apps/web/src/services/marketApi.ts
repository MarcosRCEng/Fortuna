import { apiClient } from "./apiClient.js";

export function refreshMockPrices(): Promise<{
  updatedAssets: Array<{
    assetId: string;
    symbol: string;
    currentPriceCents: number;
    variationBasisPoints: number;
  }>;
  updatedAt: string;
}> {
  return apiClient("/market/refresh-mock-prices", {
    method: "POST",
    body: JSON.stringify({}),
  });
}
