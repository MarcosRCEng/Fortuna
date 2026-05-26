import { AuditEventType } from "../events/AuditEvents.js";
import type { AuditTrailService } from "../audit/AuditTrailService.js";

export enum ConsentType {
  EDUCATIONAL_USE = "EDUCATIONAL_USE",
  SIMULATION_TERMS = "SIMULATION_TERMS",
  REAL_MARKET_DATA_FUTURE = "REAL_MARKET_DATA_FUTURE",
  PORTFOLIO_CONNECTION_FUTURE = "PORTFOLIO_CONNECTION_FUTURE",
  NO_FINANCIAL_ADVICE_ACKNOWLEDGEMENT = "NO_FINANCIAL_ADVICE_ACKNOWLEDGEMENT",
  NO_REAL_INVESTMENT_ACKNOWLEDGEMENT = "NO_REAL_INVESTMENT_ACKNOWLEDGEMENT",
}

export enum UserConsentStatus {
  ACCEPTED = "ACCEPTED",
  REVOKED = "REVOKED",
}

export interface UserConsent {
  id: string;
  playerId: string;
  type: ConsentType;
  status: UserConsentStatus;
  version: string;
  acceptedAt?: Date;
  revokedAt?: Date;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserConsentRepository {
  save(consent: UserConsent): Promise<void>;
  findActive(playerId: string, type: ConsentType): Promise<UserConsent | undefined>;
  listByPlayerId(playerId: string): Promise<UserConsent[]>;
}

export class InMemoryUserConsentRepository implements UserConsentRepository {
  private readonly consents = new Map<string, UserConsent>();

  async save(consent: UserConsent): Promise<void> {
    this.consents.set(consent.id, consent);
  }

  async findActive(
    playerId: string,
    type: ConsentType,
  ): Promise<UserConsent | undefined> {
    return [...this.consents.values()].find(
      (consent) =>
        consent.playerId === playerId &&
        consent.type === type &&
        consent.status === UserConsentStatus.ACCEPTED,
    );
  }

  async listByPlayerId(playerId: string): Promise<UserConsent[]> {
    return [...this.consents.values()]
      .filter((consent) => consent.playerId === playerId)
      .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime());
  }
}

export class UserConsentService {
  constructor(
    private readonly repository: UserConsentRepository,
    private readonly audit: AuditTrailService,
    private readonly clock: { now(): Date },
    private readonly idGenerator: () => string,
  ) {}

  async accept(input: {
    playerId: string;
    type: ConsentType;
    version?: string;
    metadata?: Record<string, unknown>;
    correlationId?: string;
  }): Promise<UserConsent> {
    const now = this.clock.now();
    const existing = await this.repository.findActive(input.playerId, input.type);
    const consent: UserConsent = existing
      ? {
          ...existing,
          version: input.version ?? existing.version,
          metadata: input.metadata ?? existing.metadata,
          updatedAt: now,
        }
      : {
          id: this.idGenerator(),
          playerId: input.playerId,
          type: input.type,
          status: UserConsentStatus.ACCEPTED,
          version: input.version ?? "mvp-1",
          acceptedAt: now,
          metadata: input.metadata ?? {},
          createdAt: now,
          updatedAt: now,
        };

    await this.repository.save(consent);
    await this.audit.record({
      playerId: input.playerId,
      eventType: AuditEventType.CONSENT_ACCEPTED,
      entityType: "UserConsent",
      entityId: consent.id,
      correlationId: input.correlationId,
      source: "consent-service",
      payload: { type: input.type, version: consent.version },
      createdAt: now,
    });
    return consent;
  }

  async revoke(input: {
    playerId: string;
    type: ConsentType;
    correlationId?: string;
  }): Promise<UserConsent> {
    const existing = await this.repository.findActive(input.playerId, input.type);
    if (!existing) {
      throw new Error(`No active consent found for ${input.type}.`);
    }

    const now = this.clock.now();
    const revoked: UserConsent = {
      ...existing,
      status: UserConsentStatus.REVOKED,
      revokedAt: now,
      updatedAt: now,
    };

    await this.repository.save(revoked);
    await this.audit.record({
      playerId: input.playerId,
      eventType: AuditEventType.CONSENT_REVOKED,
      entityType: "UserConsent",
      entityId: revoked.id,
      correlationId: input.correlationId,
      source: "consent-service",
      payload: { type: input.type, version: revoked.version },
      createdAt: now,
    });
    return revoked;
  }

  listByPlayerId(playerId: string): Promise<UserConsent[]> {
    return this.repository.listByPlayerId(playerId);
  }
}
