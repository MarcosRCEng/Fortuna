import type {
  MentorMessage,
  MentorMessageTrigger,
} from "@fortuna/domain";

export interface MentorMessageRepository {
  create(message: MentorMessage): Promise<MentorMessage>;
  findLatestByPlayer(playerId: string): Promise<MentorMessage | null>;
  findMostRelevantByPlayer(playerId: string): Promise<MentorMessage | null>;
  findByPlayer(playerId: string, limit?: number): Promise<MentorMessage[]>;
  findRecentByTrigger(
    playerId: string,
    trigger: MentorMessageTrigger,
    since: Date,
  ): Promise<MentorMessage[]>;
  markAsRead(playerId: string, messageId: string, readAt: Date): Promise<void>;
}

export class InMemoryMentorMessageRepository
  implements MentorMessageRepository
{
  private readonly messages: MentorMessage[] = [];

  async create(message: MentorMessage): Promise<MentorMessage> {
    this.messages.push(message);
    return message;
  }

  async findLatestByPlayer(playerId: string): Promise<MentorMessage | null> {
    return this.sortedByDate(this.messages.filter((item) => item.playerId === playerId))[0] ?? null;
  }

  async findMostRelevantByPlayer(playerId: string): Promise<MentorMessage | null> {
    const [message] = this.messages
      .filter((item) => item.playerId === playerId)
      .sort((left, right) => {
        const priorityDelta =
          severityPriority(right.severity) - severityPriority(left.severity);
        if (priorityDelta !== 0) {
          return priorityDelta;
        }
        return right.createdAt.getTime() - left.createdAt.getTime();
      });
    return message ?? null;
  }

  async findByPlayer(
    playerId: string,
    limit = 20,
  ): Promise<MentorMessage[]> {
    return this.sortedByDate(
      this.messages.filter((item) => item.playerId === playerId),
    ).slice(0, limit);
  }

  async findRecentByTrigger(
    playerId: string,
    trigger: MentorMessageTrigger,
    since: Date,
  ): Promise<MentorMessage[]> {
    return this.messages.filter(
      (item) =>
        item.playerId === playerId &&
        item.trigger === trigger &&
        item.createdAt >= since,
    );
  }

  async markAsRead(
    playerId: string,
    messageId: string,
    readAt: Date,
  ): Promise<void> {
    const message = this.messages.find(
      (item) => item.playerId === playerId && item.id === messageId,
    );
    if (message) {
      message.readAt = readAt;
    }
  }

  private sortedByDate(messages: MentorMessage[]): MentorMessage[] {
    return [...messages].sort(
      (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
    );
  }
}

export function severityPriority(severity: MentorMessage["severity"]): number {
  const priorities: Record<MentorMessage["severity"], number> = {
    critical_educational: 4,
    warning: 3,
    positive: 2,
    info: 1,
  };
  return priorities[severity];
}
