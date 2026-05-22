import type { GameEvent, GameEventType } from "@fortuna/domain";
import type { Clock } from "../ports/Clock.js";
import type { GameEventRepository } from "../ports/gameplay/GameEventRepository.js";
import type { PlayerProgressRepository } from "../ports/gameplay/PlayerProgressRepository.js";
import { CityEvolutionService } from "./CityEvolutionService.js";
import { GameEventService } from "./GameEventService.js";
import type { GameLoopCommand, GameLoopResult } from "./GameplaySnapshots.js";
import { MentorFeedbackService } from "./MentorFeedbackService.js";
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
  ) {}

  async handle(command: GameLoopCommand): Promise<GameLoopResult> {
    const currentProgress = await this.loadProgress(command.playerId);
    const createdEvents: GameEvent[] = [
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
        this.eventService.create(command.playerId, "MISSION_COMPLETED", {
          missionId: command.missionId,
        }),
      );
    }

    if (command.advanceMarketCycle) {
      createdEvents.push(
        this.eventService.create(command.playerId, "MARKET_CYCLE_ADVANCED", {
          advancedAt: this.clock.now().toISOString(),
        }),
      );
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
