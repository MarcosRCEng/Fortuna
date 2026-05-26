import { describe, expect, it } from "vitest";
import {
  AuditEventType,
  AuditTrailService,
  ConsentType,
  InMemoryAuditEventRepository,
  InMemoryUserConsentRepository,
  UserConsentService,
  UserConsentStatus,
} from "../src/index.js";

describe("AuditTrailService", () => {
  it("records sanitized financial events with cents and correlation id", async () => {
    let nextId = 0;
    const repository = new InMemoryAuditEventRepository();
    const audit = new AuditTrailService(repository, () => `audit-${++nextId}`);

    await audit.record({
      playerId: "player-1",
      eventType: AuditEventType.SIMULATED_ASSET_BOUGHT,
      entityType: "Transaction",
      entityId: "tx-1",
      correlationId: "corr-1",
      source: "test",
      payload: {
        totalCents: 1234,
        unitPriceCents: 617,
        token: "must-not-persist",
        nested: { authorizationHeader: "secret" },
      },
    });

    const [event] = await audit.listByPlayerId("player-1");

    expect(event.correlationId).toBe("corr-1");
    expect(event.payload).toMatchObject({
      totalCents: 1234,
      unitPriceCents: 617,
      nested: {},
    });
    expect(event.payload).not.toHaveProperty("token");
  });
});

describe("UserConsentService", () => {
  it("accepts, lists and revokes consent while recording audit events", async () => {
    let nextId = 0;
    const auditRepository = new InMemoryAuditEventRepository();
    const audit = new AuditTrailService(
      auditRepository,
      () => `audit-${++nextId}`,
    );
    const service = new UserConsentService(
      new InMemoryUserConsentRepository(),
      audit,
      { now: () => new Date("2026-05-26T12:00:00.000Z") },
      () => `consent-${++nextId}`,
    );

    const accepted = await service.accept({
      playerId: "player-1",
      type: ConsentType.SIMULATION_TERMS,
      correlationId: "corr-consent",
    });
    const duplicated = await service.accept({
      playerId: "player-1",
      type: ConsentType.SIMULATION_TERMS,
      correlationId: "corr-consent-2",
    });
    const listedAfterAccept = await service.listByPlayerId("player-1");
    const revoked = await service.revoke({
      playerId: "player-1",
      type: ConsentType.SIMULATION_TERMS,
      correlationId: "corr-revoke",
    });
    const auditEvents = await audit.listByPlayerId("player-1");

    expect(duplicated.id).toBe(accepted.id);
    expect(listedAfterAccept).toHaveLength(1);
    expect(revoked.status).toBe(UserConsentStatus.REVOKED);
    expect(auditEvents.map((event) => event.type)).toEqual(
      expect.arrayContaining([
        AuditEventType.CONSENT_REVOKED,
        AuditEventType.CONSENT_ACCEPTED,
      ]),
    );
    expect(auditEvents).toHaveLength(3);
  });
});
