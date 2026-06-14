import { apiClient } from "./apiClient.js";
import type { MarketProviderStatus } from "../types/market.js";

type MarketStatusResponse = {
  data: MarketProviderStatus;
};

export async function getMarketStatus(
  signal?: AbortSignal,
): Promise<MarketProviderStatus> {
  const response = await apiClient<MarketStatusResponse>("/market/status", {
    signal,
  });
  return response.data;
}
