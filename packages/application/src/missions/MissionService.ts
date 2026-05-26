import type { GameEvent, Mission } from "@fortuna/domain";
import type { Clock } from "../ports/Clock.js";
import type { LoggerPort } from "../ports/LoggerPort.js";
import type { GameEventRepository } from "../ports/gameplay/GameEventRepository.js";
import type { PlayerProgressRepository } from "../ports/gameplay/PlayerProgressRepository.js";
import { GameEventService } from "../gameplay/GameEventService.js";
import type { GameplayPortfolioSnapshot } from "../gameplay/GameplaySnapshots.js";
import {
  createInitialPlayerProgress,
  type PlayerProgress,
} from "../gameplay/PlayerProgress.js";
import { ProgressionService } from "../gameplay/ProgressionService.js";
import { MVP_MISSIONS } from "./MissionCatalog.js";
import { MissionEvaluator } from "./MissionEvaluator.js";

export interface MissionServiceResult {
  missions: Mission[];
  completedEvents: GameEvent[];
  progress: PlayerProgress;
}

export class MissionService {
  constructor(
    private readonly gameEvents: GameEventRepository,
    private readonly playerProgress: PlayerProgressRepository,
    private readonly eventService: GameEventService,
    private readonly progressionService: ProgressionService,
    private readonly evaluator: MissionEvaluator,
    private readonly clock: Clock,
    private readonly logger?: LoggerPort,
  ) {}

  async listPlayerMissions(
    playerId: string,
    portfolio?: GameplayPortfolioSnapshot,
  ): Promise<Mission[]> {
    const progress = await this.loadProgress(playerId);
    const events = await this.gameEvents.listByPlayerId(playerId);

    return this.evaluateCatalog(playerId, progress, events, portfolio).missions;
  }

  async getPlayerMission(
    playerId: string,
    missionId: string,
    portfolio?: GameplayPortfolioSnapshot,
  ): Promise<Mission | undefined> {
    return (await this.listPlayerMissions(playerId, portfolio)).find(
      (mission) => mission.id === missionId,
    );
  }

  async processEvents(
    playerId: string,
    events: GameEvent[],
    portfolio?: GameplayPortfolioSnapshot,
    correlationId?: string,
  ): Promise<MissionServiceResult> {
    const progress = await this.loadProgress(playerId);
    const historicalEvents = await this.gameEvents.listByPlayerId(playerId);
    const evaluation = this.evaluateCatalog(
      playerId,
      progress,
      [...historicalEvents, ...events],
      portfolio,
    );

    const completedEvents = evaluation.completedMissions.map((mission) =>
      this.eventService.create(
        playerId,
        "MISSION_COMPLETED",
        {
          missionId: mission.id,
          missionCode: mission.code,
          rewardType: mission.reward.type,
          rewardXp: mission.reward.amount ?? 0,
        },
        "MISSION",
        correlationId,
      ),
    );

    for (const mission of evaluation.completedMissions) {
      this.logger?.info("Educational mission completed", {
        module: "missions",
        action: "mission_completed",
        correlationId,
        context: { playerId, missionId: mission.id },
      });
    }

    if (completedEvents.length > 0) {
      await this.gameEvents.appendMany(completedEvents);
      const nextProgress = this.progressionService.applyEvents(
        progress,
        completedEvents,
      );
      await this.playerProgress.save(nextProgress);
      return {
        missions: evaluation.missions,
        completedEvents,
        progress: nextProgress,
      };
    }

    return { missions: evaluation.missions, completedEvents, progress };
  }

  async claimReward(
    playerId: string,
    missionId: string,
    correlationId?: string,
  ): Promise<{
    mission: Mission;
    events: GameEvent[];
    progress: PlayerProgress;
  }> {
    const progress = await this.loadProgress(playerId);
    const mission = MVP_MISSIONS.find((item) => item.id === missionId);
    if (!mission) {
      throw new Error(`Mission ${missionId} was not found.`);
    }

    if (!progress.completedMissionIds.includes(missionId)) {
      throw new Error("Mission reward can only be claimed after completion.");
    }

    if ((progress.rewardedMissionIds ?? []).includes(missionId)) {
      throw new Error("Mission reward was already claimed.");
    }

    const events = [
      this.eventService.create(
          playerId,
          "MISSION_REWARD_CLAIMED",
          {
            missionId,
            rewardType: mission.reward.type,
            targetId: mission.reward.targetId ?? mission.id,
          },
        "MISSION",
        correlationId,
      ),
      ...this.rewardEvents(playerId, mission, correlationId),
    ];

    await this.gameEvents.appendMany(events);
    const nextProgress = this.progressionService.applyEvents(progress, events);
    await this.playerProgress.save(nextProgress);
    this.logger?.info("Educational mission reward claimed", {
      module: "missions",
      action: "mission_reward_claimed",
      correlationId,
      context: { playerId, missionId, rewardType: mission.reward.type },
    });

    return {
      mission: { ...mission, status: "REWARDED" },
      events,
      progress: nextProgress,
    };
  }

  private evaluateCatalog(
    playerId: string,
    progress: PlayerProgress,
    events: GameEvent[],
    portfolio?: GameplayPortfolioSnapshot,
  ): { missions: Mission[]; completedMissions: Mission[] } {
    const missions: Mission[] = [];
    const completedMissions: Mission[] = [];

    for (const mission of MVP_MISSIONS) {
      try {
        const result = this.evaluator.evaluate(mission, {
          playerId,
          progress,
          events,
          portfolio,
        });
        missions.push(result.mission);
        if (result.completedNow) {
          completedMissions.push(result.mission);
        }
      } catch (error) {
        this.logger?.error("Failed to evaluate educational mission", {
          module: "missions",
          action: "mission_evaluation_failed",
          context: { playerId, missionId: mission.id },
          error,
        });
      }
    }

    return { missions, completedMissions };
  }

  private rewardEvents(
    playerId: string,
    mission: Mission,
    correlationId?: string,
  ): GameEvent[] {
    if (mission.reward.type === "EDUCATIONAL_BADGE") {
      return [
        this.eventService.create(
          playerId,
          "EDUCATIONAL_BADGE_GRANTED",
          { badgeId: mission.reward.targetId ?? mission.id },
          "MISSION",
          correlationId,
        ),
      ];
    }

    if (mission.reward.type === "UNLOCK_DISTRICT") {
      return [
        this.eventService.create(
          playerId,
          "NEW_DISTRICT_UNLOCKED",
          { districtId: mission.reward.targetId ?? mission.id },
          "MISSION",
          correlationId,
        ),
      ];
    }

    if (mission.reward.type === "UNLOCK_REPORT") {
      return [
        this.eventService.create(
          playerId,
          "NEW_TOOL_UNLOCKED",
          { reportId: mission.reward.targetId ?? mission.id },
          "MISSION",
          correlationId,
        ),
      ];
    }

    if (mission.reward.type === "UNLOCK_ADVANCED_TIP") {
      return [
        this.eventService.create(
          playerId,
          "NEW_TOOL_UNLOCKED",
          { toolId: mission.reward.targetId ?? mission.id },
          "MISSION",
          correlationId,
        ),
      ];
    }

    return [];
  }

  private async loadProgress(playerId: string): Promise<PlayerProgress> {
    return (
      (await this.playerProgress.findByPlayerId(playerId)) ??
      createInitialPlayerProgress(playerId, this.clock.now())
    );
  }
}
