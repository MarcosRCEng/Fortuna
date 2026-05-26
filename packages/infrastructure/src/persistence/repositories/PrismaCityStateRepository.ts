import { Prisma } from "@prisma/client";
import type { FortunaPrismaClient } from "../prisma/PrismaClientFactory.js";

export interface PersistedCityState {
  id: string;
  playerId: string;
  level: number;
  experiencePoints: number;
  unlockedBuildings: unknown;
  cityScore: number;
}

export class PrismaCityStateRepository {
  constructor(private readonly prisma: FortunaPrismaClient) {}

  async findByPlayerId(playerId: string): Promise<PersistedCityState | undefined> {
    const state = await this.prisma.cityState.findUnique({
      where: { playerId },
    });

    return state
      ? {
          id: state.id,
          playerId: state.playerId,
          level: state.level,
          experiencePoints: state.experiencePoints,
          unlockedBuildings: state.unlockedBuildings,
          cityScore: state.cityScore,
        }
      : undefined;
  }

  async update(state: PersistedCityState): Promise<void> {
    await this.prisma.cityState.update({
      where: { playerId: state.playerId },
      data: {
        level: state.level,
        experiencePoints: state.experiencePoints,
        unlockedBuildings: state.unlockedBuildings as Prisma.InputJsonValue,
        cityScore: state.cityScore,
      },
    });
  }
}
