import type { FortunaPrismaClient } from "../prisma/PrismaClientFactory.js";

export interface MentorTipHistoryInput {
  id: string;
  playerId: string;
  tipCode: string;
  tipCategory: string;
  relatedEventId?: string;
  relatedAssetId?: string;
  message: string;
  shownAt: Date;
  acknowledgedAt?: Date;
}

export class PrismaMentorTipHistoryRepository {
  constructor(private readonly prisma: FortunaPrismaClient) {}

  async append(input: MentorTipHistoryInput): Promise<void> {
    await this.prisma.mentorTipHistory.create({
      data: {
        id: input.id,
        playerId: input.playerId,
        tipCode: input.tipCode,
        tipCategory: input.tipCategory,
        relatedEventId: input.relatedEventId,
        relatedAssetId: input.relatedAssetId,
        message: input.message,
        shownAt: input.shownAt,
        acknowledgedAt: input.acknowledgedAt,
      },
    });
  }

  async listByPlayerId(playerId: string): Promise<MentorTipHistoryInput[]> {
    const tips = await this.prisma.mentorTipHistory.findMany({
      where: { playerId },
      orderBy: { shownAt: "desc" },
    });

    return tips.map((tip) => ({
      id: tip.id,
      playerId: tip.playerId,
      tipCode: tip.tipCode,
      tipCategory: tip.tipCategory,
      ...(tip.relatedEventId ? { relatedEventId: tip.relatedEventId } : {}),
      ...(tip.relatedAssetId ? { relatedAssetId: tip.relatedAssetId } : {}),
      message: tip.message,
      shownAt: tip.shownAt,
      ...(tip.acknowledgedAt ? { acknowledgedAt: tip.acknowledgedAt } : {}),
    }));
  }
}
