import type {
  MentorContext,
  MentorEducationalConcept,
  MentorRule,
  MentorTip,
} from "@fortuna/domain";

export interface MentorTipProvider {
  getAvailableTips(context: MentorContext): Promise<MentorTip[]>;
  getTipsByRule(ruleId: string): Promise<MentorTip[]>;
  getTipsByConcept(concept: MentorEducationalConcept): Promise<MentorTip[]>;
  getShownTips(playerId: string): Promise<MentorTip[]>;
}

export interface MentorRuleWithTip extends MentorRule {
  createTip(context: MentorContext, createdAt: Date): MentorTip;
}
