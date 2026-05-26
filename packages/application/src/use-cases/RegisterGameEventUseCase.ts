import type {
  GameEvent,
  GameEventMetadata,
  GameEventType,
} from "@fortuna/domain";
import type { Clock } from "../ports/Clock.js";
import type { GameEventRepository } from "../ports/gameplay/GameEventRepository.js";
import type { PlayerProgressRepository } from "../ports/gameplay/PlayerProgressRepository.js";
import { GameEventService } from "../gameplay/GameEventService.js";
import { UNIQUE_GAME_EVENT_TYPES } from "../gameplay/GameDesignCatalog.js";
import {
  createInitialPlayerProgress,
  type PlayerProgress,
} from "../gameplay/PlayerProgress.js";
import { ProgressionService } from "../gameplay/ProgressionService.js";

export interface RegisterGameEventCommand {
  playerId: string;
  eventType: GameEventType;
  metadata?: GameEventMetadata;
  source?: GameEvent["source"];
  correlationId?: string;
  unique?: boolean;
}

export interface RegisterGameEventResult {
  gameEvent?: GameEvent;
  registered: boolean;
  skippedReason?: "DUPLICATE_UNIQUE_EVENT";
}

export class RegisterGameEventUseCase {
  constructor(
    private readonly gameEvents: GameEventRepository,
    private readonly playerProgress: PlayerProgressRepository,
    private readonly eventService: GameEventService,
    private readonly progressionService: ProgressionService,
    private readonly clock: Clock,
  ) {}

  async execute(
    command: RegisterGameEventCommand,
  ): Promise<RegisterGameEventResult> {
    const progress = await this.loadProgress(command.playerId);
    const shouldBeUnique =
      command.unique ?? UNIQUE_GAME_EVENT_TYPES.includes(command.eventType);

    if (shouldBeUnique && progress.seenEventTypes.includes(command.eventType)) {
      return {
        registered: false,
        skippedReason: "DUPLICATE_UNIQUE_EVENT",
      };
    }

    const gameEvent = this.eventService.create(
      command.playerId,
      command.eventType,
      command.metadata,
      command.source ?? "GAMEPLAY",
      command.correlationId,
    );

    await this.gameEvents.append(gameEvent);
    await this.playerProgress.save(
      this.progressionService.applyEvents(progress, [gameEvent]),
    );

    return { gameEvent, registered: true };
  }

  private async loadProgress(playerId: string): Promise<PlayerProgress> {
    return (
      (await this.playerProgress.findByPlayerId(playerId)) ??
      createInitialPlayerProgress(playerId, this.clock.now())
    );
  }
}
