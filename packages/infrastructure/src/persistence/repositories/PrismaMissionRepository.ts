import type { FortunaPrismaClient } from "../prisma/PrismaClientFactory.js";
import { centsToNumber } from "../prisma/mappers.js";

export interface PersistedMission {
  id: string;
  code: string;
  title: string;
  description: string;
  objective: string;
  completionCriteria: unknown;
  rewardType: string;
  rewardAmountCents: number;
  educationalExplanation: string;
  isActive: boolean;
}

export class PrismaMissionRepository {
  constructor(private readonly prisma: FortunaPrismaClient) {}

  async listActive(): Promise<PersistedMission[]> {
    const missions = await this.prisma.mission.findMany({
      where: { isActive: true },
      orderBy: { code: "asc" },
    });

    return missions.map((mission) => ({
      id: mission.id,
      code: mission.code,
      title: mission.title,
      description: mission.description,
      objective: mission.objective,
      completionCriteria: mission.completionCriteria,
      rewardType: mission.rewardType,
      rewardAmountCents: centsToNumber(mission.rewardAmountCents),
      educationalExplanation: mission.educationalExplanation,
      isActive: mission.isActive,
    }));
  }

  async findByCode(code: string): Promise<PersistedMission | undefined> {
    const mission = await this.prisma.mission.findUnique({
      where: { code },
    });

    return mission
      ? {
          id: mission.id,
          code: mission.code,
          title: mission.title,
          description: mission.description,
          objective: mission.objective,
          completionCriteria: mission.completionCriteria,
          rewardType: mission.rewardType,
          rewardAmountCents: centsToNumber(mission.rewardAmountCents),
          educationalExplanation: mission.educationalExplanation,
          isActive: mission.isActive,
        }
      : undefined;
  }
}
