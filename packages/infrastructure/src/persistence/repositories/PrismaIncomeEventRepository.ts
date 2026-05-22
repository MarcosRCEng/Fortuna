import type { IncomeEventRepository } from "@fortuna/application";
import type { IncomeEvent } from "@fortuna/domain";
import type { FortunaPrismaClient } from "../prisma/PrismaClientFactory.js";
import { toIncomeEvent } from "../prisma/mappers.js";

export class PrismaIncomeEventRepository implements IncomeEventRepository {
  constructor(private readonly prisma: FortunaPrismaClient) {}

  async findById(id: string): Promise<IncomeEvent | undefined> {
    const incomeEvent = await this.prisma.incomeEvent.findUnique({
      where: { id },
      include: { asset: true },
    });

    return incomeEvent ? toIncomeEvent(incomeEvent) : undefined;
  }

  async listAvailableByPlayerId(playerId: string): Promise<IncomeEvent[]> {
    const incomeEvents = await this.prisma.incomeEvent.findMany({
      where: { playerId, status: "AVAILABLE" },
      include: { asset: true },
      orderBy: { dueDate: "asc" },
    });

    return incomeEvents.map(toIncomeEvent);
  }

  async save(incomeEvent: IncomeEvent): Promise<void> {
    await this.prisma.incomeEvent.update({
      where: { id: incomeEvent.id },
      data: {
        status: incomeEvent.isCollected ? "COLLECTED" : "AVAILABLE",
        collectedAt: incomeEvent.isCollected ? new Date() : null,
      },
    });
  }
}
