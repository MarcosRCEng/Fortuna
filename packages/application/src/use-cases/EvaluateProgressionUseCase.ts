import type { GameEvent, GameEventType } from "@fortuna/domain";
import type { Clock } from "../ports/Clock.js";
import type { GameEventRepository } from "../ports/gameplay/GameEventRepository.js";
import type { PlayerProgressRepository } from "../ports/gameplay/PlayerProgressRepository.js";
import { CityEvolutionService } from "../gameplay/CityEvolutionService.js";
import { GameEventService } from "../gameplay/GameEventService.js";
import { FINANCIAL_MATURITY_LEVELS } from "../gameplay/GameDesignCatalog.js";
import type { CityEvolutionState } from "../gameplay/GameplaySnapshots.js";
import {
  createInitialPlayerProgress,
  type PlayerProgress,
} from "../gameplay/PlayerProgress.js";
import { ProgressionService } from "../gameplay/ProgressionService.js";
import { UnlockService } from "../gameplay/UnlockService.js";

export interface EvaluateProgressionResult {
  previousLevel: number;
  currentLevel: number;
  currentLevelName: string;
  unlocksGranted: string[];
  badgesGranted: string[];
  eventsGenerated: GameEvent[];
  progress: PlayerProgress;
  city: CityEvolutionState;
}

export class EvaluateProgressionUseCase {
  constructor(
    private readonly gameEvents: GameEventRepository,
    private readonly playerProgress: PlayerProgressRepository,
    private readonly eventService: GameEventService,
    private readonly progressionService: ProgressionService,
    private readonly unlockService: UnlockService,
    private readonly cityEvolutionService: CityEvolutionService,
    private readonly clock: Clock,
  ) {}

  async execute(playerId: string): Promise<EvaluateProgressionResult> {
    const before = await this.loadProgress(playerId);
    const unlockEvents = this.unlockService.evaluate(
      playerId,
      before,
      (type, metadata) => this.eventService.create(playerId, type, metadata),
    );
    const afterUnlocks = this.progressionService.applyEvents(
      before,
      unlockEvents,
    );
    const levelUpEvents = this.progressionService.createLevelUpEvents(
      playerId,
      before,
      afterUnlocks,
      (type: GameEventType, metadata) =>
        this.eventService.create(playerId, type, metadata),
    );
    const progress = this.progressionService.applyEvents(
      afterUnlocks,
      levelUpEvents,
    );
    const eventsGenerated = [...unlockEvents, ...levelUpEvents];

    if (eventsGenerated.length > 0) {
      await this.gameEvents.appendMany(eventsGenerated);
    }
    await this.playerProgress.save(progress);

    return {
      previousLevel: before.level,
      currentLevel: progress.level,
      currentLevelName:
        FINANCIAL_MATURITY_LEVELS.find(
          (definition) => definition.level === progress.level,
        )?.name ?? "Iniciante Financeiro",
      unlocksGranted: eventsGenerated
        .map((event) => this.unlockIdFromEvent(event))
        .filter((id): id is string => Boolean(id)),
      badgesGranted: eventsGenerated
        .filter((event) => event.type === "EDUCATIONAL_BADGE_GRANTED")
        .map((event) => String(event.metadata?.badgeId)),
      eventsGenerated,
      progress,
      city: this.cityEvolutionService.describe(progress),
    };
  }

  private unlockIdFromEvent(event: GameEvent): string | undefined {
    if (event.type === "NEW_DISTRICT_UNLOCKED") {
      return String(event.metadata?.districtId);
    }

    if (event.type === "NEW_ASSET_CLASS_UNLOCKED") {
      return String(event.metadata?.assetClass);
    }

    if (event.type === "NEW_TOOL_UNLOCKED") {
      return String(event.metadata?.toolId ?? event.metadata?.reportId);
    }

    return undefined;
  }

  private async loadProgress(playerId: string): Promise<PlayerProgress> {
    const progress = await this.playerProgress.findByPlayerId(playerId);

    if (!progress) {
      return createInitialPlayerProgress(playerId, this.clock.now());
    }

    return {
      ...progress,
      unlockedReports: progress.unlockedReports ?? [],
    };
  }
}
