import { describe, expect, it } from "vitest";
import { AssetType, type GameEvent } from "@fortuna/domain";
import {
  GameEventService,
  MissionEvaluator,
  MissionService,
  ProgressionService,
  createInitialPlayerProgress,
  type Clock,
  type GameEventRepository,
  type PlayerProgress,
  type PlayerProgressRepository,
} from "../src/index.js";

class InMemoryGameEventRepository implements GameEventRepository {
  public readonly events: GameEvent[] = [];

  async append(event: GameEvent): Promise<void> {
    this.events.push(event);
  }

  async appendMany(events: GameEvent[]): Promise<void> {
    this.events.push(...events);
  }

  async listByPlayerId(playerId: string): Promise<GameEvent[]> {
    return this.events.filter((event) => event.playerId === playerId);
  }
}

class InMemoryPlayerProgressRepository implements PlayerProgressRepository {
  constructor(public progress?: PlayerProgress) {}

  async findByPlayerId(playerId: string): Promise<PlayerProgress | undefined> {
    return this.progress?.playerId === playerId ? this.progress : undefined;
  }

  async save(progress: PlayerProgress): Promise<void> {
    this.progress = progress;
  }
}

const now = new Date("2026-05-22T12:00:00.000Z");
const clock: Clock = { now: () => now };
const playerId = "player-1";

function makeService(progress = createInitialPlayerProgress(playerId, now)) {
  let nextId = 0;
  const events = new InMemoryGameEventRepository();
  const progressRepository = new InMemoryPlayerProgressRepository(progress);
  const eventService = new GameEventService(clock, () => `event-${++nextId}`);
  const service = new MissionService(
    events,
    progressRepository,
    eventService,
    new ProgressionService(clock),
    new MissionEvaluator(),
    clock,
  );

  return { events, progressRepository, service };
}

describe("MissionService", () => {
  it("processes event flow and records mission completion", async () => {
    const { events, progressRepository, service } = makeService();

    const result = await service.processEvents(playerId, [
      {
        id: "incoming-1",
        playerId,
        type: "ASSET_PURCHASED",
        occurredAt: now,
        source: "FINANCIAL_EVENT",
        metadata: {
          assetType: AssetType.FIXED_INCOME,
          amountCents: 10_000,
        },
      },
    ]);

    expect(result.completedEvents).toHaveLength(1);
    expect(result.completedEvents[0]?.metadata?.missionId).toBe(
      "first-fixed-income",
    );
    expect(events.events).toHaveLength(1);
    expect(progressRepository.progress?.completedMissionIds).toContain(
      "first-fixed-income",
    );
  });

  it("allows claiming a completed mission reward once", async () => {
    const progress = createInitialPlayerProgress(playerId, now);
    progress.completedMissionIds.push("first-fixed-income");
    const { progressRepository, service } = makeService(progress);

    const result = await service.claimReward(playerId, "first-fixed-income");

    expect(result.mission.status).toBe("REWARDED");
    expect(result.events.map((event) => event.type)).toContain(
      "MISSION_REWARD_CLAIMED",
    );
    expect(progressRepository.progress?.rewardedMissionIds).toContain(
      "first-fixed-income",
    );
  });

  it("blocks reward claim for incomplete or already rewarded missions", async () => {
    const incomplete = makeService();
    await expect(
      incomplete.service.claimReward(playerId, "first-fixed-income"),
    ).rejects.toThrow("Mission reward can only be claimed after completion.");

    const progress = createInitialPlayerProgress(playerId, now);
    progress.completedMissionIds.push("first-fixed-income");
    progress.rewardedMissionIds.push("first-fixed-income");
    const rewarded = makeService(progress);

    await expect(
      rewarded.service.claimReward(playerId, "first-fixed-income"),
    ).rejects.toThrow("Mission reward was already claimed.");
  });
});
