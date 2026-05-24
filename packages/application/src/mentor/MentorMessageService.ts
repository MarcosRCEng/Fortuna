import {
  MentorMessage,
  MentorMessageTrigger,
  RiskLevel,
  type FinancialEvent,
  type GameEvent,
  type MentorContext,
} from "@fortuna/domain";
import type { Clock } from "../ports/Clock.js";
import type { LoggerPort } from "../ports/LoggerPort.js";
import type { MentorMessageRepository } from "../ports/MentorMessageRepository.js";
import { severityPriority } from "../ports/MentorMessageRepository.js";
import {
  mentorTemplates,
  validateMentorTemplateText,
  type MentorMessageTemplate,
} from "./MentorMessageTemplates.js";

export interface MentorMessageServiceOptions {
  concentrationBasisPoints?: number;
  idleCashBasisPoints?: number;
  deduplicationWindowMinutes?: number;
}

export class MentorMessageService {
  constructor(
    private readonly repository: MentorMessageRepository,
    private readonly clock: Clock,
    private readonly idGenerator: () => string,
    private readonly logger?: LoggerPort,
    private readonly options: MentorMessageServiceOptions = {},
  ) {
    validateMentorTemplateText();
  }

  async evaluateForEvent(
    event: FinancialEvent | GameEvent | "PortfolioUpdated" | "GameLoopEvaluated",
    context: MentorContext,
  ): Promise<MentorMessage[]> {
    const candidates = this.evaluateCandidates(event, context);
    const created: MentorMessage[] = [];

    for (const candidate of candidates.sort(
      (left, right) =>
        severityPriority(right.severity) - severityPriority(left.severity),
    )) {
      const duplicate = await this.isDuplicate(context.playerId, candidate.trigger);
      if (duplicate) {
        this.logger?.info("Mentor message deduplicated", {
          module: "mentor",
          action: "mentor_message_deduplicated",
          context: { playerId: context.playerId, trigger: candidate.trigger },
        });
        continue;
      }

      const message = await this.repository.create({
        id: this.idGenerator(),
        playerId: context.playerId,
        type: candidate.type,
        trigger: candidate.trigger,
        title: candidate.title,
        message: candidate.message,
        educationalConcept: candidate.educationalConcept,
        severity: candidate.severity,
        relatedEntityType: candidate.relatedEntityType,
        relatedEntityId: candidate.relatedEntityId,
        metadata: candidate.metadata,
        createdAt: this.clock.now(),
      });
      created.push(message);
      this.logger?.info("Mentor message created", {
        module: "mentor",
        action: "mentor_message_created",
        context: {
          playerId: context.playerId,
          trigger: message.trigger,
          severity: message.severity,
          relatedEntityType: message.relatedEntityType,
          relatedEntityId: message.relatedEntityId,
        },
      });
    }

    return created;
  }

  async findLatest(playerId: string): Promise<MentorMessage | null> {
    return this.repository.findMostRelevantByPlayer(playerId);
  }

  async findByPlayer(
    playerId: string,
    limit?: number,
  ): Promise<MentorMessage[]> {
    return this.repository.findByPlayer(playerId, limit);
  }

  async markAsRead(playerId: string, messageId: string): Promise<void> {
    await this.repository.markAsRead(playerId, messageId, this.clock.now());
  }

  private evaluateCandidates(
    event: FinancialEvent | GameEvent | "PortfolioUpdated" | "GameLoopEvaluated",
    context: MentorContext,
  ): MentorCandidate[] {
    const candidates: MentorCandidate[] = [];

    if (this.isAssetBought(event)) {
      if (this.isFirstPurchase(context)) {
        candidates.push(this.fromTemplate(mentorTemplates.firstPurchase, event));
      }
      if (this.maxAssetAllocationBasisPoints(context) >= this.concentrationLimit()) {
        candidates.push(
          this.fromTemplate(mentorTemplates.concentratedPurchase, event, {
            maxAllocationBasisPoints: this.maxAssetAllocationBasisPoints(context),
          }),
        );
      }
      if (this.isPortfolioWithoutDiversification(context)) {
        candidates.push(
          this.fromTemplate(mentorTemplates.portfolioWithoutDiversification, event),
        );
      }
    }

    if (this.isAssetSold(event)) {
      const reference = this.saleReference(event, context);
      if (reference && event.unitPrice.cents < reference.averagePriceCents) {
        candidates.push(
          this.fromTemplate(mentorTemplates.saleWithLoss, event, reference),
        );
      }
      if (reference && event.unitPrice.cents > reference.averagePriceCents) {
        candidates.push(
          this.fromTemplate(mentorTemplates.saleWithGain, event, reference),
        );
      }
      if (this.isPortfolioWithoutDiversification(context)) {
        candidates.push(
          this.fromTemplate(mentorTemplates.portfolioWithoutDiversification, event),
        );
      }
    }

    if (this.isIncomeCollected(event) || this.hasAvailableIncome(context)) {
      candidates.push(this.fromTemplate(mentorTemplates.availableIncome, event));
    }

    if (this.isMissionCompleted(event)) {
      candidates.push(
        this.fromTemplate(mentorTemplates.missionCompleted, event, {
          missionId:
            typeof event.metadata?.missionId === "string"
              ? event.metadata.missionId
              : null,
        }),
      );
    }

    if (this.isRiskyAssetViewed(event)) {
      candidates.push(this.fromTemplate(mentorTemplates.riskyAssetViewed, event));
    }

    if (event === "PortfolioUpdated" || event === "GameLoopEvaluated") {
      if (this.isPortfolioWithoutDiversification(context)) {
        candidates.push(
          this.fromTemplate(mentorTemplates.portfolioWithoutDiversification, event),
        );
      }
      if (this.isIdleCashExcess(context)) {
        candidates.push(this.fromTemplate(mentorTemplates.idleCashExcess, event));
      }
      if (this.hasAvailableIncome(context)) {
        candidates.push(this.fromTemplate(mentorTemplates.availableIncome, event));
      }
    }

    return candidates;
  }

  private fromTemplate(
    template: MentorMessageTemplate,
    event: FinancialEvent | GameEvent | string,
    metadata: Record<string, string | number | boolean | null> = {},
  ): MentorCandidate {
    return {
      ...template,
      relatedEntityType: this.relatedEntityType(event),
      relatedEntityId: this.relatedEntityId(event),
      metadata,
    };
  }

  private async isDuplicate(
    playerId: string,
    trigger: MentorMessageTrigger,
  ): Promise<boolean> {
    const minutes = this.options.deduplicationWindowMinutes ?? 60;
    const since = new Date(this.clock.now().getTime() - minutes * 60_000);
    const recent = await this.repository.findRecentByTrigger(
      playerId,
      trigger,
      since,
    );
    return recent.length > 0;
  }

  private isFirstPurchase(context: MentorContext): boolean {
    return context.portfolioPositions.length <= 1;
  }

  private isPortfolioWithoutDiversification(context: MentorContext): boolean {
    const assetTypes = new Set(
      context.portfolioPositions.map((position) => position.assetType),
    );
    return context.portfolioPositions.length === 1 || assetTypes.size === 1;
  }

  private isIdleCashExcess(context: MentorContext): boolean {
    if (context.totalEquityInCents.cents <= 0) {
      return false;
    }
    const basisPoints = Math.floor(
      (context.currentCashInCents.cents * 10_000) /
        context.totalEquityInCents.cents,
    );
    return basisPoints >= (this.options.idleCashBasisPoints ?? 6_000);
  }

  private maxAssetAllocationBasisPoints(context: MentorContext): number {
    if (context.totalEquityInCents.cents <= 0) {
      return 0;
    }
    return context.portfolioPositions.reduce(
      (max, position) =>
        Math.max(
          max,
          Math.floor(
            (position.marketValue.cents * 10_000) /
              context.totalEquityInCents.cents,
          ),
        ),
      0,
    );
  }

  private concentrationLimit(): number {
    return this.options.concentrationBasisPoints ?? 5_000;
  }

  private hasAvailableIncome(context: MentorContext): boolean {
    return context.recentEvents.some(
      (event) =>
        event.type === "YieldGenerated" ||
        (event.type === "IncomeCollected" && event.total.cents > 0),
    );
  }

  private saleReference(
    event: FinancialEvent,
    context: MentorContext,
  ): { averagePriceCents: number; assetId?: string } | undefined {
    if (!this.isAssetSold(event)) {
      return undefined;
    }
    const position = context.portfolioPositions.find(
      (item) => item.assetId === event.asset.id,
    );
    return {
      averagePriceCents:
        event.averagePrice?.cents ??
        position?.averagePrice.cents ??
        event.unitPrice.cents,
      assetId: event.asset.id,
    };
  }

  private isAssetBought(
    event: FinancialEvent | GameEvent | string,
  ): event is FinancialEvent & { type: "AssetBought" } {
    return typeof event === "object" && event.type === "AssetBought";
  }

  private isAssetSold(
    event: FinancialEvent | GameEvent | string,
  ): event is FinancialEvent & { type: "AssetSold" } {
    return typeof event === "object" && event.type === "AssetSold";
  }

  private isIncomeCollected(
    event: FinancialEvent | GameEvent | string,
  ): boolean {
    return (
      typeof event === "object" &&
      (event.type === "IncomeCollected" || event.type === "INCOME_COLLECTED")
    );
  }

  private isMissionCompleted(
    event: FinancialEvent | GameEvent | string,
  ): event is GameEvent {
    return typeof event === "object" && event.type === "MISSION_COMPLETED";
  }

  private isRiskyAssetViewed(
    event: FinancialEvent | GameEvent | string,
  ): event is GameEvent {
    return (
      typeof event === "object" &&
      (event.type === "ASSET_DETAILS_VIEWED" ||
        event.type === "RISK_EDUCATION_VIEWED") &&
      event.metadata?.riskLevel === RiskLevel.HIGH
    );
  }

  private relatedEntityType(
    event: FinancialEvent | GameEvent | string,
  ): string | undefined {
    if (typeof event !== "object") {
      return undefined;
    }
    if ("asset" in event) {
      return "asset";
    }
    if (event.metadata?.assetId) {
      return "asset";
    }
    if (event.metadata?.missionId) {
      return "mission";
    }
    return "event";
  }

  private relatedEntityId(
    event: FinancialEvent | GameEvent | string,
  ): string | undefined {
    if (typeof event !== "object") {
      return undefined;
    }
    if ("asset" in event) {
      return event.asset.id;
    }
    if (typeof event.metadata?.assetId === "string") {
      return event.metadata.assetId;
    }
    if (typeof event.metadata?.missionId === "string") {
      return event.metadata.missionId;
    }
    return "id" in event ? event.id : undefined;
  }
}

interface MentorCandidate
  extends Omit<MentorMessage, "id" | "playerId" | "createdAt" | "readAt"> {}
