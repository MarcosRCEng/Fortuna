import { apiClient } from "./apiClient.js";
import type { CollectIncomeResult } from "../types/transaction.js";

export function collectIncome(playerId: string): Promise<CollectIncomeResult> {
  return apiClient<CollectIncomeResult>(
    playerId === "me" ? "/me/income/collect" : `/players/${playerId}/income/collect`,
    {
      method: "POST",
      body: JSON.stringify({}),
    },
  );
}
