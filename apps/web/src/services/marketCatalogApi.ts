import { apiClient } from "./apiClient.js";
import type { MarketCatalogPage, MarketCatalogQuery } from "../types/market.js";

export function getMarketCatalog(
  query: MarketCatalogQuery,
  signal?: AbortSignal,
): Promise<MarketCatalogPage> {
  const params = new URLSearchParams();
  if (query.search) {
    params.set("search", query.search);
  }
  if (query.types && query.types.length > 0) {
    params.set("types", query.types.join(","));
  }
  if (query.sectors && query.sectors.length > 0) {
    params.set("sectors", query.sectors.join(","));
  }
  if (query.sortBy) {
    params.set("sortBy", query.sortBy);
  }
  if (query.sortOrder) {
    params.set("sortOrder", query.sortOrder);
  }
  params.set("page", String(query.page));
  params.set("pageSize", String(query.pageSize));

  return apiClient<MarketCatalogPage>(`/market/catalog?${params.toString()}`, {
    signal,
  });
}
