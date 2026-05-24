import { apiClient } from "./apiClient.js";
import type { CollectIncomeResult } from "../types/transaction.js";

export function collectIncome(playerId: string): Promise<CollectIncomeResult> {
  return apiClient<CollectIncomeResult>(`/players/${playerId}/income/collect`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}
