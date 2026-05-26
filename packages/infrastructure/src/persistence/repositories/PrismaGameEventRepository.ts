import type { GameEventRepository } from "@fortuna/application";
import type { GameEvent } from "@fortuna/domain";
import type { FortunaPrismaClient } from "../prisma/PrismaClientFactory.js";

export class PrismaGameEventRepository implements GameEventRepository {
  constructor(private readonly prisma: FortunaPrismaClient) {}

  async append(event: GameEvent): Promise<void> {
    await this.prisma.gameEvent.create({
      data: {
        id: event.id,
        playerId: event.playerId,
        eventType: event.type,
        eventPayload: {
          source: event.source,
          ...(event.correlationId ? { correlationId: event.correlationId } : {}),
          ...(event.metadata ? { metadata: event.metadata } : {}),
        },
        occurredAt: event.occurredAt,
      },
    });
  }

  async appendMany(events: GameEvent[]): Promise<void> {
    for (const event of events) {
      await this.append(event);
    }
  }

  async listByPlayerId(playerId: string): Promise<GameEvent[]> {
    const events = await this.prisma.gameEvent.findMany({
      where: { playerId },
      orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }],
    });

    return events.map((event) => {
      const payload = isEventPayload(event.eventPayload)
        ? event.eventPayload
        : {};
      return {
        id: event.id,
        playerId: event.playerId,
        type: event.eventType as GameEvent["type"],
        occurredAt: event.occurredAt,
        source: payload.source ?? "GAMEPLAY",
        ...(payload.correlationId
          ? { correlationId: payload.correlationId }
          : {}),
        ...(payload.metadata ? { metadata: payload.metadata } : {}),
      };
    });
  }
}

function isEventPayload(value: unknown): value is {
  source?: GameEvent["source"];
  correlationId?: string;
  metadata?: GameEvent["metadata"];
} {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
