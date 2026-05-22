import type { MentorContext, MentorRule, MentorTip } from "@fortuna/domain";
import type { Clock } from "../ports/Clock.js";
import type { LoggerPort } from "../ports/LoggerPort.js";
import { INITIAL_MENTOR_RULES } from "./MentorRules.js";
import type { MentorRuleWithTip } from "./MentorTipProvider.js";

export interface RuleBasedMentorOptions {
  maxTipsPerEvaluation?: number;
}

export class RuleBasedMentorService {
  constructor(
    private readonly clock: Clock,
    private readonly logger?: LoggerPort,
    private readonly rules: MentorRuleWithTip[] = INITIAL_MENTOR_RULES,
    private readonly options: RuleBasedMentorOptions = {},
  ) {}

  evaluate(context: MentorContext): MentorTip[] {
    const createdAt = this.clock.now();
    const maxTips = this.options.maxTipsPerEvaluation ?? 3;
    const tips: MentorTip[] = [];

    for (const rule of this.enabledRules()) {
      this.logger?.debug("Mentor rule evaluation started", {
        module: "mentor",
        action: "mentor_rule_evaluated",
        context: this.logContext(context, rule),
      });

      if (this.isBlockedByMaxOccurrences(rule, context)) {
        this.logger?.debug("Mentor rule blocked by max occurrences", {
          module: "mentor",
          action: "mentor_rule_blocked_max_occurrences",
          context: this.logContext(context, rule),
        });
        continue;
      }

      if (this.isBlockedByCooldown(rule, context, createdAt)) {
        this.logger?.debug("Mentor rule blocked by cooldown", {
          module: "mentor",
          action: "mentor_rule_blocked_cooldown",
          context: this.logContext(context, rule),
        });
        continue;
      }

      if (!rule.evaluate(context)) {
        this.logger?.debug("Mentor rule condition not met", {
          module: "mentor",
          action: "mentor_rule_not_triggered_condition",
          context: this.logContext(context, rule),
        });
        continue;
      }

      const tip = rule.createTip(context, createdAt);
      tips.push(tip);
      this.logger?.info("Mentor rule triggered", {
        module: "mentor",
        action: "mentor_rule_triggered",
        context: {
          ...this.logContext(context, rule),
          tipId: tip.id,
          tipType: tip.type,
          severity: tip.severity,
        },
      });

      if (tips.length >= maxTips) {
        break;
      }
    }

    return tips;
  }

  private enabledRules(): MentorRuleWithTip[] {
    return this.rules
      .filter((rule) => rule.enabled)
      .sort((left, right) => right.priority - left.priority);
  }

  private isBlockedByMaxOccurrences(
    rule: MentorRule,
    context: MentorContext,
  ): boolean {
    if (!rule.maxOccurrences) {
      return false;
    }

    const occurrences = context.alreadyShownTips
      .filter((tip) => tip.ruleId === rule.id)
      .reduce((total, tip) => total + tip.occurrences, 0);

    return occurrences >= rule.maxOccurrences;
  }

  private isBlockedByCooldown(
    rule: MentorRule,
    context: MentorContext,
    now: Date,
  ): boolean {
    if (!rule.cooldown) {
      return false;
    }

    const lastShownAt = context.alreadyShownTips
      .filter((tip) => tip.ruleId === rule.id)
      .map((tip) => tip.shownAt.getTime())
      .sort((left, right) => right - left)[0];

    if (!lastShownAt) {
      return false;
    }

    const elapsedMinutes = Math.floor((now.getTime() - lastShownAt) / 60_000);
    return elapsedMinutes < rule.cooldown.minutes;
  }

  private logContext(
    context: MentorContext,
    rule: MentorRule,
  ): Record<string, unknown> {
    return {
      playerId: context.playerId,
      ruleId: rule.id,
      ruleCode: rule.code,
      triggerType: rule.triggerType,
      currentGameLoopMoment: context.currentGameLoopMoment,
      cashCents: context.currentCashInCents.cents,
      totalEquityCents: context.totalEquityInCents.cents,
      positionCount: context.portfolioPositions.length,
      allocationCount: context.assetAllocation.length,
      recentEventTypes: context.recentEvents.map((event) => event.type),
      completedMissionCount: context.completedMissions.length,
      activeMissionCount: context.activeMissions.length,
      shownTipCount: context.alreadyShownTips.length,
    };
  }
}
