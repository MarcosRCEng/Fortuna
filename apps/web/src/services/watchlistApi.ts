import { apiClient } from "./apiClient.js";
import type {
  MarketAssetGroup,
  PlayerWatchlist,
  WatchlistPreferences,
  WatchlistSortBy,
} from "../types/market.js";

export function getWatchlist(): Promise<PlayerWatchlist> {
  return apiClient<PlayerWatchlist>("/me/watchlist");
}

export function addWatchlistItem(symbol: string): Promise<PlayerWatchlist> {
  return apiClient<PlayerWatchlist>("/me/watchlist/items", {
    method: "POST",
    body: JSON.stringify({ symbol }),
  });
}

export function removeWatchlistItem(symbol: string): Promise<PlayerWatchlist> {
  return apiClient<PlayerWatchlist>(
    `/me/watchlist/items/${encodeURIComponent(symbol)}`,
    { method: "DELETE" },
  );
}

export function updateWatchlistPreferences(
  preferences: Partial<{
    visibleGroups: MarketAssetGroup[];
    portfolioOnly: boolean;
    sortBy: WatchlistSortBy;
    sortOrder: WatchlistPreferences["sortOrder"];
    maxItemsPerGroup: number;
  }>,
): Promise<PlayerWatchlist> {
  return apiClient<PlayerWatchlist>("/me/watchlist/preferences", {
    method: "PATCH",
    body: JSON.stringify(preferences),
  });
}
