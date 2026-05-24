import { apiClient } from "./apiClient.js";
import type { MentorMessage, PlayerSummary } from "../types/player.js";
import type { ApiMoney } from "../types/finance.js";
import type { Player } from "../types/player.js";

type PlayerSummaryResponse = {
  playerId: string;
  walletBalance: ApiMoney;
  totalInvested: ApiMoney;
  portfolioMarketValue: ApiMoney;
  totalEquity: ApiMoney;
  totalIncomeCollected: ApiMoney;
  totalTransactions: number;
};

type MentorLatestMessageResponse = {
  message: MentorMessage | null;
};

export function createPlayer(name: string): Promise<Player> {
  return apiClient<Player>("/players", {
    method: "POST",
    body: JSON.stringify({
      name,
      nickname: "Investidor em formacao",
    }),
  });
}

export function getPlayer(playerId: string): Promise<Player> {
  return apiClient<Player>(`/players/${playerId}`);
}

export async function getPlayerSummary(
  playerId: string,
): Promise<PlayerSummary> {
  const [response, mentor] = await Promise.all([
    apiClient<PlayerSummaryResponse>(`/players/${playerId}/summary`),
    apiClient<MentorLatestMessageResponse>(`/players/${playerId}/mentor/latest`),
  ]);
  return {
    playerId: response.playerId,
    availableCashCents: response.walletBalance.amountCents,
    totalInvestedCents: response.totalInvested.amountCents,
    portfolioMarketValueCents: response.portfolioMarketValue.amountCents,
    totalEquityCents: response.totalEquity.amountCents,
    totalIncomeCollectedCents: response.totalIncomeCollected.amountCents,
    totalTransactions: response.totalTransactions,
    collectibleIncomeCents: null,
    level: Math.max(1, Math.floor(response.totalTransactions / 3) + 1),
    progressPercent: Math.min(100, (response.totalTransactions % 3) * 34),
    mentorTip:
      mentor.message?.message ??
      "Diversificar ajuda a entender melhor risco e liquidez. Rentabilidade passada ou simulada nao garante resultados futuros.",
    mentorMessage: mentor.message,
  };
}

export async function markMentorMessageAsRead(
  playerId: string,
  messageId: string,
): Promise<void> {
  await apiClient(`/players/${playerId}/mentor/messages/${messageId}/read`, {
    method: "POST",
  });
}
