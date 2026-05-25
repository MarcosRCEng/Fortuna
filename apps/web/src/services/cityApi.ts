import { apiClient } from "./apiClient.js";

export type CityStateResponse = {
  playerId: string;
  level: number;
  totalPatrimonyCents: number;
  collectableIncomeCents: number;
  completedMissionsCount: number;
  updatedAt: string;
};

export function getCityState(playerId: string): Promise<CityStateResponse> {
  return apiClient<CityStateResponse>(`/players/${playerId}/city`);
}
