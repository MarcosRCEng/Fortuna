import { apiClient } from "./apiClient.js";

export type MissionStatus =
  | "LOCKED"
  | "AVAILABLE"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CLAIMED";

export type PlayerMission = {
  id: string;
  code: string;
  title: string;
  description: string;
  objective: string;
  educationalExplanation: string;
  type: string;
  status: MissionStatus;
  currentValue: number;
  targetValue: number;
  reward: {
    type: string;
    amount?: number;
    label: string;
  };
  completedAt?: string;
};

export function getMissions(
  playerId: string,
): Promise<{ missions: PlayerMission[] }> {
  return apiClient(`/players/${playerId}/missions`);
}

export function initializeMissions(
  playerId: string,
): Promise<{ missions: PlayerMission[] }> {
  return apiClient(`/players/${playerId}/missions/initialize`, {
    method: "POST",
  });
}

export function viewAssetEducation(playerId: string, assetId: string) {
  return apiClient(`/players/${playerId}/assets/${assetId}/education-viewed`, {
    method: "POST",
  });
}
