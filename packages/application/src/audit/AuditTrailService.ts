import {
  AuditEnvironment,
  type AuditEvent,
  type AuditEventInput,
  AuditSeverity,
} from "../events/AuditEvents.js";

const SENSITIVE_KEYS = [
  "authorization",
  "cookie",
  "password",
  "secret",
  "token",
  "credential",
  "headers",
];

export interface AuditEventRepository {
  append(event: AuditEvent): Promise<void>;
  listByPlayerId(playerId: string): Promise<AuditEvent[]>;
}

export class InMemoryAuditEventRepository implements AuditEventRepository {
  private readonly events: AuditEvent[] = [];

  async append(event: AuditEvent): Promise<void> {
    this.events.push(event);
  }

  async listByPlayerId(playerId: string): Promise<AuditEvent[]> {
    return this.events
      .filter((event) => event.playerId === playerId)
      .sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime());
  }
}

export class AuditTrailService {
  constructor(
    private readonly repository: AuditEventRepository,
    private readonly idGenerator: () => string,
    private readonly environment: AuditEnvironment = AuditEnvironment.LOCAL,
  ) {}

  async record(input: AuditEventInput): Promise<void> {
    const occurredAt = input.createdAt ?? new Date();
    const event: AuditEvent = {
      id: this.idGenerator(),
      type: input.eventType,
      eventType: input.eventType,
      playerId: input.playerId,
      entityType: input.entityType,
      entityId: input.entityId,
      occurredAt,
      createdAt: occurredAt,
      metadata: sanitizePayload(input.payload ?? {}),
      payload: sanitizePayload(input.payload ?? {}),
      source: input.source,
      severity: input.severity ?? AuditSeverity.INFO,
      environment: this.environment,
      correlationId: input.correlationId ?? this.idGenerator(),
    };

    await this.repository.append(event);
  }

  listByPlayerId(playerId: string): Promise<AuditEvent[]> {
    return this.repository.listByPlayerId(playerId);
  }
}

export function sanitizePayload(
  value: Record<string, unknown>,
): Record<string, unknown> {
  return sanitizeObject(value) as Record<string, unknown>;
}

function sanitizeObject(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeObject(item));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !isSensitiveKey(key))
      .map(([key, nested]) => [key, sanitizeObject(nested)]),
  );
}

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return SENSITIVE_KEYS.some((sensitive) => normalized.includes(sensitive));
}
