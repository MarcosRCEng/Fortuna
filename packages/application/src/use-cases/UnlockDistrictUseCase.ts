import type { GameEvent } from "@fortuna/domain";
import type { Clock } from "../ports/Clock.js";
import type { GameEventRepository } from "../ports/gameplay/GameEventRepository.js";
import type { PlayerProgressRepository } from "../ports/gameplay/PlayerProgressRepository.js";
import { GameEventService } from "../gameplay/GameEventService.js";
import {
  createInitialPlayerProgress,
  type PlayerProgress,
} from "../gameplay/PlayerProgress.js";
import { ProgressionService } from "../gameplay/ProgressionService.js";

export interface UnlockDistrictCommand {
  playerId: string;
  districtId: string;
  reason: string;
  correlationId?: string;
}

export interface UnlockDistrictResult {
  districtUnlocked: boolean;
  eventGenerated?: GameEvent;
}

export class UnlockDistrictUseCase {
  constructor(
    private readonly gameEvents: GameEventRepository,
    private readonly playerProgress: PlayerProgressRepository,
    private readonly eventService: GameEventService,
    private readonly progressionService: ProgressionService,
    private readonly clock: Clock,
  ) {}

  async execute(command: UnlockDistrictCommand): Promise<UnlockDistrictResult> {
    const progress = await this.loadProgress(command.playerId);

    if (progress.unlockedDistricts.includes(command.districtId)) {
      return { districtUnlocked: false };
    }

    const eventGenerated = this.eventService.create(
      command.playerId,
      "NEW_DISTRICT_UNLOCKED",
      {
        districtId: command.districtId,
        reason: command.reason,
      },
      "GAMEPLAY",
      command.correlationId,
    );

    await this.gameEvents.append(eventGenerated);
    await this.playerProgress.save(
      this.progressionService.applyEvents(progress, [eventGenerated]),
    );

    return { districtUnlocked: true, eventGenerated };
  }

  private async loadProgress(playerId: string): Promise<PlayerProgress> {
    return (
      (await this.playerProgress.findByPlayerId(playerId)) ??
      createInitialPlayerProgress(playerId, this.clock.now())
    );
  }
}
