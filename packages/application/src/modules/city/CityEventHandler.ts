import type { CityEvolutionService } from "../../gameplay/CityEvolutionService.js";
import type { PlayerProgressRepository } from "../../ports/gameplay/PlayerProgressRepository.js";
import type { LoggerPort } from "../../ports/LoggerPort.js";
import type { AppEvent } from "../../events/AppEvent.js";
import type { EventHandler } from "../../events/EventHandler.js";

export class CityEventHandler implements EventHandler {
  readonly name = "CityEventHandler";
  readonly critical = false;

  constructor(
    private readonly progress: PlayerProgressRepository,
    private readonly city: CityEvolutionService,
    private readonly logger?: LoggerPort,
  ) {}

  async handle(event: AppEvent): Promise<void> {
    const progress = await this.progress.findByPlayerId(event.playerId);
    if (!progress) {
      this.logger?.debug("City refresh skipped because progress is missing", {
        module: "city",
        action: "city_refresh_skipped_missing_progress",
        correlationId: event.metadata.correlationId,
        context: {
          playerId: event.playerId,
          sourceEventType: event.type,
        },
      });
      return;
    }

    const city = this.city.describe(progress);
    this.logger?.info("City reacted to application event", {
      module: "city",
      action: "city_update_flow_completed",
      correlationId: event.metadata.correlationId,
      context: {
        playerId: event.playerId,
        sourceEventType: event.type,
        cityLevel: city.cityLevel,
        unlockedDistrictCount: city.unlockedDistricts.length,
      },
    });
  }
}
