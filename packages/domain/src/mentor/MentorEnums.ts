export enum MentorTipType {
  FIXED = "FIXED",
  EVENT = "EVENT",
  ASSET = "ASSET",
  PORTFOLIO_COMPOSITION = "PORTFOLIO_COMPOSITION",
  EDUCATIONAL_ALERT = "EDUCATIONAL_ALERT",
  CONCEPT_EXPLANATION = "CONCEPT_EXPLANATION",
  HEALTHY_BEHAVIOR = "HEALTHY_BEHAVIOR",
}

export enum MentorTriggerType {
  SESSION_START = "SESSION_START",
  PORTFOLIO_VIEW = "PORTFOLIO_VIEW",
  FINANCIAL_EVENT = "FINANCIAL_EVENT",
  MISSION_EVENT = "MISSION_EVENT",
  GAME_LOOP = "GAME_LOOP",
  ASSET_VIEW = "ASSET_VIEW",
}

export enum MentorTipSeverity {
  INFO = "INFO",
  POSITIVE = "POSITIVE",
  WARNING = "WARNING",
}

export enum MentorMessageType {
  ORIENTATION = "orientation",
  EDUCATIONAL_ALERT = "educational_alert",
  CONGRATULATIONS = "congratulations",
  CONCEPTUAL_EXPLANATION = "conceptual_explanation",
  MISSION_SUGGESTION = "mission_suggestion",
  RISK_REFLECTION = "risk_reflection",
}

export enum MentorMessageTrigger {
  CONCENTRATED_PURCHASE = "concentrated_purchase",
  SALE_WITH_LOSS = "sale_with_loss",
  SALE_WITH_GAIN = "sale_with_gain",
  FIRST_PURCHASE = "first_purchase",
  PORTFOLIO_WITHOUT_DIVERSIFICATION = "portfolio_without_diversification",
  IDLE_CASH_EXCESS = "idle_cash_excess",
  AVAILABLE_INCOME = "available_income",
  MISSION_COMPLETED = "mission_completed",
  RISKY_ASSET_VIEWED = "risky_asset_viewed",
}

export enum MentorMessageSeverity {
  POSITIVE = "positive",
  INFO = "info",
  WARNING = "warning",
  CRITICAL_EDUCATIONAL = "critical_educational",
}

export enum MentorEducationalConcept {
  RISK = "RISK",
  LIQUIDITY = "LIQUIDITY",
  FIXED_INCOME = "FIXED_INCOME",
  FII = "FII",
  STOCKS = "STOCKS",
  DIVIDENDS = "DIVIDENDS",
  INTEREST = "INTEREST",
  AVERAGE_PRICE = "AVERAGE_PRICE",
  VOLATILITY = "VOLATILITY",
  DIVERSIFICATION = "DIVERSIFICATION",
  EMERGENCY_RESERVE = "EMERGENCY_RESERVE",
}

export enum MentorGameLoopMoment {
  SESSION_START = "SESSION_START",
  HOME = "HOME",
  PORTFOLIO = "PORTFOLIO",
  AFTER_FINANCIAL_OPERATION = "AFTER_FINANCIAL_OPERATION",
  AFTER_MISSION = "AFTER_MISSION",
  CITY_VIEW = "CITY_VIEW",
}
