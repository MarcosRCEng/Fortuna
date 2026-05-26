import type { GameEvent } from "@fortuna/domain";
import type { Clock } from "../ports/Clock.js";
import type { GameEventRepository } from "../ports/gameplay/GameEventRepository.js";
import type { PlayerProgressRepository } from "../ports/gameplay/PlayerProgressRepository.js";
import { CityEvolutionService } from "../gameplay/CityEvolutionService.js";
import { FINANCIAL_MATURITY_LEVELS } from "../gameplay/GameDesignCatalog.js";
import type {
  CityEvolutionState,
  MentorFeedback,
} from "../gameplay/GameplaySnapshots.js";
import { MentorFeedbackService } from "../gameplay/MentorFeedbackService.js";
import {
  createInitialPlayerProgress,
  type PlayerProgress,
} from "../gameplay/PlayerProgress.js";

export interface PlayerProgressDto {
  playerId: string;
  financialMaturityLevel: {
    level: number;
    name: string;
  };
  cityLevel: number;
  city: CityEvolutionState;
  unlockedDistricts: string[];
  unlockedTools: string[];
  unlockedReports: string[];
  badges: string[];
  activeMissions: string[];
  completedMissions: string[];
  recentGameEvents: GameEvent[];
  mentorFeedback: MentorFeedback[];
}

export class GetPlayerProgressUseCase {
  constructor(
    private readonly gameEvents: GameEventRepository,
    private readonly playerProgress: PlayerProgressRepository,
    private readonly cityEvolutionService: CityEvolutionService,
    private readonly mentorFeedbackService: MentorFeedbackService,
    private readonly clock: Clock,
  ) {}

  async execute(playerId: string): Promise<PlayerProgressDto> {
    const progress =
      (await this.playerProgress.findByPlayerId(playerId)) ??
      createInitialPlayerProgress(playerId, this.clock.now());
    const recentGameEvents = (await this.gameEvents.listByPlayerId(playerId))
      .slice()
      .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
      .slice(0, 10);
    const city = this.cityEvolutionService.describe(progress);

    return {
      playerId,
      financialMaturityLevel: {
        level: progress.level,
        name:
          FINANCIAL_MATURITY_LEVELS.find(
            (definition) => definition.level === progress.level,
          )?.name ?? "Iniciante Financeiro",
      },
      cityLevel: city.cityLevel,
      city,
      unlockedDistricts: [...progress.unlockedDistricts],
      unlockedTools: [...progress.unlockedTools],
      unlockedReports: [...(progress.unlockedReports ?? [])],
      badges: [...progress.grantedBadges],
      activeMissions: this.activeMissions(progress),
      completedMissions: [...progress.completedMissionIds],
      recentGameEvents,
      mentorFeedback: this.mentorFeedbackService.fromEvents(recentGameEvents),
    };
  }

  private activeMissions(progress: PlayerProgress): string[] {
    const missions: string[] = [];

    if (!progress.completedMissionIds.includes("MISSION_FIRST_STEPS")) {
      missions.push("MISSION_FIRST_STEPS");
    }

    if (
      progress.seenEventTypes.includes("FIRST_BUY") &&
      !progress.completedMissionIds.includes("MISSION_DIVERSIFICATION")
    ) {
      missions.push("MISSION_DIVERSIFICATION");
    }

    if (
      progress.seenEventTypes.includes("EMERGENCY_RESERVE_STARTED") &&
      !progress.completedMissionIds.includes("MISSION_RESERVE")
    ) {
      missions.push("MISSION_RESERVE");
    }

    return missions;
  }
}
