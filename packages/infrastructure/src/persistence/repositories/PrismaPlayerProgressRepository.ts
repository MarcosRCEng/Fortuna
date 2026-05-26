import type {
  PlayerProgress,
  PlayerProgressRepository,
} from "@fortuna/application";
import type { GameEventType } from "@fortuna/domain";
import type { FortunaPrismaClient } from "../prisma/PrismaClientFactory.js";

type StoredProgress = Omit<PlayerProgress, "updatedAt" | "seenEventTypes"> & {
  updatedAt: string;
  seenEventTypes: string[];
};

type CityStatePayload = {
  version: 1;
  playerProgress?: StoredProgress;
};

export class PrismaPlayerProgressRepository
  implements PlayerProgressRepository
{
  constructor(private readonly prisma: FortunaPrismaClient) {}

  async findByPlayerId(playerId: string): Promise<PlayerProgress | undefined> {
    const state = await this.prisma.cityState.findUnique({
      where: { playerId },
    });
    const payload = parsePayload(state?.unlockedBuildings);
    const progress = payload?.playerProgress;
    if (!progress) {
      return undefined;
    }

    return {
      ...progress,
      seenEventTypes: progress.seenEventTypes as GameEventType[],
      updatedAt: new Date(progress.updatedAt),
    };
  }

  async save(progress: PlayerProgress): Promise<void> {
    const payload: CityStatePayload = {
      version: 1,
      playerProgress: {
        ...progress,
        updatedAt: progress.updatedAt.toISOString(),
      },
    };

    await this.prisma.cityState.upsert({
      where: { playerId: progress.playerId },
      create: {
        id: `city-${progress.playerId}`,
        playerId: progress.playerId,
        level: progress.level,
        experiencePoints: progress.experiencePoints,
        cityScore: progress.completedMissionIds.length,
        unlockedBuildings: payload,
      },
      update: {
        level: progress.level,
        experiencePoints: progress.experiencePoints,
        cityScore: progress.completedMissionIds.length,
        unlockedBuildings: payload,
      },
    });
  }
}

function parsePayload(value: unknown): CityStatePayload | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const candidate = value as Partial<CityStatePayload>;
  return candidate.version === 1 ? (candidate as CityStatePayload) : undefined;
}
