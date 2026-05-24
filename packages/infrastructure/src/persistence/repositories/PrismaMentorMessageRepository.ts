import {
  MentorMessageSeverity,
  MentorMessageTrigger,
  MentorMessageType,
  type MentorMessage,
} from "@fortuna/domain";
import {
  severityPriority,
  type MentorMessageRepository,
} from "@fortuna/application";
import type { FortunaPrismaClient } from "../prisma/PrismaClientFactory.js";

export class PrismaMentorMessageRepository
  implements MentorMessageRepository
{
  constructor(private readonly prisma: FortunaPrismaClient) {}

  async create(message: MentorMessage): Promise<MentorMessage> {
    const created = await this.prisma.mentorMessage.create({
      data: {
        id: message.id,
        playerId: message.playerId,
        type: message.type,
        trigger: message.trigger,
        title: message.title,
        message: message.message,
        educationalConcept: message.educationalConcept,
        severity: message.severity,
        relatedEntityType: message.relatedEntityType,
        relatedEntityId: message.relatedEntityId,
        metadata: message.metadata,
        createdAt: message.createdAt,
        readAt: message.readAt,
      },
    });
    return toMentorMessage(created);
  }

  async findLatestByPlayer(playerId: string): Promise<MentorMessage | null> {
    const message = await this.prisma.mentorMessage.findFirst({
      where: { playerId },
      orderBy: { createdAt: "desc" },
    });
    return message ? toMentorMessage(message) : null;
  }

  async findMostRelevantByPlayer(
    playerId: string,
  ): Promise<MentorMessage | null> {
    const messages = await this.findByPlayer(playerId, 20);
    return (
      messages.sort((left, right) => {
        const priorityDelta =
          severityPriority(right.severity) - severityPriority(left.severity);
        if (priorityDelta !== 0) {
          return priorityDelta;
        }
        return right.createdAt.getTime() - left.createdAt.getTime();
      })[0] ?? null
    );
  }

  async findByPlayer(
    playerId: string,
    limit = 20,
  ): Promise<MentorMessage[]> {
    const messages = await this.prisma.mentorMessage.findMany({
      where: { playerId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return messages.map(toMentorMessage);
  }

  async findRecentByTrigger(
    playerId: string,
    trigger: MentorMessageTrigger,
    since: Date,
  ): Promise<MentorMessage[]> {
    const messages = await this.prisma.mentorMessage.findMany({
      where: { playerId, trigger, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
    });
    return messages.map(toMentorMessage);
  }

  async markAsRead(
    playerId: string,
    messageId: string,
    readAt: Date,
  ): Promise<void> {
    await this.prisma.mentorMessage.updateMany({
      where: { id: messageId, playerId },
      data: { readAt },
    });
  }
}

type PrismaMentorMessage = Awaited<
  ReturnType<FortunaPrismaClient["mentorMessage"]["findFirst"]>
> extends infer T
  ? NonNullable<T>
  : never;

function toMentorMessage(row: PrismaMentorMessage): MentorMessage {
  return {
    id: row.id,
    playerId: row.playerId,
    type: row.type as MentorMessageType,
    trigger: row.trigger as MentorMessageTrigger,
    title: row.title,
    message: row.message,
    educationalConcept: row.educationalConcept ?? undefined,
    severity: row.severity as MentorMessageSeverity,
    relatedEntityType: row.relatedEntityType ?? undefined,
    relatedEntityId: row.relatedEntityId ?? undefined,
    metadata: isMentorMetadata(row.metadata) ? row.metadata : undefined,
    createdAt: row.createdAt,
    readAt: row.readAt ?? undefined,
  };
}

function isMentorMetadata(
  value: unknown,
): value is Record<string, string | number | boolean | null> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
