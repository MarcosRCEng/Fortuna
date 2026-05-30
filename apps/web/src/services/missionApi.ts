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
  return apiClient(playerId === "me" ? "/me/missions" : `/players/${playerId}/missions`);
}

export function initializeMissions(
  playerId: string,
): Promise<{ missions: PlayerMission[] }> {
  return apiClient(playerId === "me" ? "/me/missions/initialize" : `/players/${playerId}/missions/initialize`, {
    method: "POST",
  });
}

export function viewAssetEducation(playerId: string, assetId: string) {
  return apiClient(
    playerId === "me"
      ? `/me/assets/${assetId}/education-viewed`
      : `/players/${playerId}/assets/${assetId}/education-viewed`,
    {
      method: "POST",
    },
  );
}
