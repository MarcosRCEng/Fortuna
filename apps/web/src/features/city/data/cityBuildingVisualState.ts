import type { CityBuildingStatus } from "../city.types.js";
import type { CityVisualStage } from "../types/city-render.types.js";

export type CityBuildingConstructionState =
  | "locked"
  | "foundation"
  | "initial"
  | "intermediate"
  | "evolved";

export type CityBuildingVisualState = {
  visualStage: CityVisualStage;
  constructionState: CityBuildingConstructionState;
};

export function resolveCityBuildingVisualState({
  level,
  status,
}: {
  level: number;
  status?: CityBuildingStatus;
}): CityBuildingVisualState {
  const safeLevel = Number.isFinite(level) ? Math.max(0, Math.floor(level)) : 0;

  if (status === "locked") {
    return { visualStage: 0, constructionState: "locked" };
  }

  if (safeLevel <= 0) {
    return { visualStage: 0, constructionState: "foundation" };
  }

  if (safeLevel === 1) {
    return { visualStage: 1, constructionState: "initial" };
  }

  if (safeLevel === 2) {
    return { visualStage: 2, constructionState: "intermediate" };
  }

  return { visualStage: 3, constructionState: "evolved" };
}

export function getCityVisualStageFromLevel(level: number): CityVisualStage {
  return resolveCityBuildingVisualState({ level }).visualStage;
}
