import { apiClient } from "./apiClient.js";
import type { MarketAssetDetail } from "../types/market.js";

export function getMarketAssetDetail(
  symbol: string,
  signal?: AbortSignal,
): Promise<MarketAssetDetail> {
  return apiClient<MarketAssetDetail>(
    `/market/assets/${encodeURIComponent(symbol)}/detail`,
    { signal },
  );
}
