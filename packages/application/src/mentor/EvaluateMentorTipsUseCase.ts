import type { MentorContext, MentorTip } from "@fortuna/domain";
import { RuleBasedMentorService } from "./RuleBasedMentorService.js";

export class EvaluateMentorTipsUseCase {
  constructor(private readonly mentor: RuleBasedMentorService) {}

  execute(context: MentorContext): MentorTip[] {
    return this.mentor.evaluate(context);
  }
}
