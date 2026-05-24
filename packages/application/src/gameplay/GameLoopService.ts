import type { GameEvent, GameEventType } from "@fortuna/domain";
import type { Clock } from "../ports/Clock.js";
import type { GameEventRepository } from "../ports/gameplay/GameEventRepository.js";
import type { PlayerProgressRepository } from "../ports/gameplay/PlayerProgressRepository.js";
import { CityEvolutionService } from "./CityEvolutionService.js";
import { GameEventService } from "./GameEventService.js";
import type { GameLoopCommand, GameLoopResult } from "./GameplaySnapshots.js";
import { MentorFeedbackService } from "./MentorFeedbackService.js";
import { MVP_MISSIONS } from "../missions/MissionCatalog.js";
import { MissionEvaluator } from "../missions/MissionEvaluator.js";
import {
  createInitialPlayerProgress,
  type PlayerProgress,
} from "./PlayerProgress.js";
import { ProgressionService } from "./ProgressionService.js";
import { UnlockService } from "./UnlockService.js";

export class GameLoopService {
  constructor(
    private readonly gameEvents: GameEventRepository,
    private readonly playerProgress: PlayerProgressRepository,
    private readonly eventService: GameEventService,
    private readonly progressionService: ProgressionService,
    private readonly unlockService: UnlockService,
    private readonly cityEvolutionService: CityEvolutionService,
    private readonly mentorFeedbackService: MentorFeedbackService,
    private readonly clock: Clock,
    private readonly missionEvaluator?: MissionEvaluator,
  ) {}

  async handle(command: GameLoopCommand): Promise<GameLoopResult> {
    const currentProgress = await this.loadProgress(command.playerId);
    const createdEvents: GameEvent[] = [
      ...(command.gameplayEvents ?? []),
      ...this.eventService.fromFinancialEvents(command.financialEvents ?? [], {
        portfolio: command.portfolio,
        progress: currentProgress,
      }),
    ];

    if (command.portfolio && (command.financialEvents?.length ?? 0) === 0) {
      createdEvents.push(
        ...this.eventService.fromPortfolioSnapshot(command.playerId, {
          portfolio: command.portfolio,
          progress: currentProgress,
        }),
      );
    }

    if (command.missionId) {
      createdEvents.push(
        this.eventService.create(
          command.playerId,
          "MISSION_COMPLETED",
          {
            missionId: command.missionId,
          },
          "MISSION",
          command.correlationId,
        ),
      );
    }

    if (command.advanceMarketCycle) {
      createdEvents.push(
        this.eventService.create(
          command.playerId,
          "MARKET_CYCLE_ADVANCED",
          {
            advancedAt: this.clock.now().toISOString(),
          },
          "MARKET_CYCLE",
          command.correlationId,
        ),
      );
    }

    if (command.marketPricesRefreshed) {
      createdEvents.push(
        this.eventService.create(
          command.playerId,
          "MARKET_PRICES_REFRESHED",
          {
            updatedAssetCount: command.marketPricesRefreshed.updatedAssetCount,
          },
          "MARKET_CYCLE",
          command.correlationId,
        ),
      );
    }

    if (this.missionEvaluator) {
      for (const mission of MVP_MISSIONS) {
        const result = this.missionEvaluator.evaluate(mission, {
          playerId: command.playerId,
          events: createdEvents,
          progress: currentProgress,
          portfolio: command.portfolio,
        });

        if (result.completedNow) {
          createdEvents.push(
            this.eventService.create(
              command.playerId,
              "MISSION_COMPLETED",
              {
                missionId: mission.id,
                missionCode: mission.code,
                rewardType: mission.reward.type,
                rewardXp: mission.reward.amount ?? 0,
              },
              "MISSION",
              command.correlationId,
            ),
          );
        }
      }
    }

    const afterGameplayEvents = this.progressionService.applyEvents(
      currentProgress,
      createdEvents,
    );
    const unlockEvents = this.unlockService.evaluate(
      command.playerId,
      afterGameplayEvents,
      (type, metadata) =>
        this.eventService.create(command.playerId, type, metadata),
    );
    const afterUnlocks = this.progressionService.applyEvents(
      afterGameplayEvents,
      unlockEvents,
    );
    const levelUpEvents = this.progressionService.createLevelUpEvents(
      command.playerId,
      currentProgress,
      afterUnlocks,
      (
        type: GameEventType,
        metadata?: Record<string, string | number | boolean>,
      ) => this.eventService.create(command.playerId, type, metadata),
    );
    const finalProgress = this.progressionService.applyEvents(
      afterUnlocks,
      levelUpEvents,
    );

    const events = [...createdEvents, ...unlockEvents, ...levelUpEvents];
    await this.gameEvents.appendMany(events);
    await this.playerProgress.save(finalProgress);

    return {
      events,
      progress: finalProgress,
      city: this.cityEvolutionService.describe(finalProgress),
      mentorFeedback: this.mentorFeedbackService.fromEvents(events),
    };
  }

  private async loadProgress(playerId: string): Promise<PlayerProgress> {
    return (
      (await this.playerProgress.findByPlayerId(playerId)) ??
      createInitialPlayerProgress(playerId, this.clock.now())
    );
  }
}
