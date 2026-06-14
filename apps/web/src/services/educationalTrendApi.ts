import { apiClient } from "./apiClient.js";
import type {
  EducationalTrend,
  EducationalTrendList,
} from "../types/market.js";

export function getEducationalTrend(
  symbol: string,
  signal?: AbortSignal,
): Promise<EducationalTrend> {
  return apiClient<EducationalTrend>(
    `/me/mentor/educational-trends/${encodeURIComponent(symbol)}`,
    { signal },
  );
}

export function getEducationalTrends(
  symbols: string[],
  signal?: AbortSignal,
): Promise<EducationalTrendList> {
  const uniqueSymbols = [
    ...new Set(
      symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean),
    ),
  ];
  return apiClient<EducationalTrendList>(
    `/me/mentor/educational-trends?symbols=${encodeURIComponent(uniqueSymbols.join(","))}`,
    { signal },
  );
}
