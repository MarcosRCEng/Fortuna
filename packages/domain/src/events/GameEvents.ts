export const GAME_EVENT_TYPES = [
  "PLAYER_CREATED",
  "ASSET_PURCHASED",
  "ASSET_SOLD",
  "INCOME_COLLECTED",
  "PORTFOLIO_UPDATED",
  "MENTOR_TIP_READ",
  "TRANSACTION_HISTORY_VIEWED",
  "CITY_DISTRICT_UNLOCKED",
  "REPORT_VIEWED",
  "FIRST_BUY",
  "FIRST_SELL",
  "FIRST_INCOME_RECEIVED",
  "FIRST_DIVERSIFICATION",
  "NET_WORTH_REACHED",
  "MISSION_COMPLETED",
  "MARKET_PRICES_REFRESHED",
  "EMERGENCY_RESERVE_STARTED",
  "EMERGENCY_RESERVE_COMPLETED",
  "EXCESSIVE_CONCENTRATION_DETECTED",
  "NEW_DISTRICT_UNLOCKED",
  "NEW_ASSET_CLASS_UNLOCKED",
  "NEW_TOOL_UNLOCKED",
  "MARKET_CYCLE_ADVANCED",
  "PLAYER_LEVEL_UP",
  "EDUCATIONAL_BADGE_GRANTED",
  "MISSION_REWARD_CLAIMED",
] as const;

export type GameEventType = (typeof GAME_EVENT_TYPES)[number];

export type GameEventMetadataValue = string | number | boolean;

export type GameEventMetadata = Record<string, GameEventMetadataValue>;

export interface GameEvent {
  id: string;
  playerId: string;
  type: GameEventType;
  occurredAt: Date;
  source:
    | "GAMEPLAY"
    | "FINANCIAL_EVENT"
    | "MARKET_CYCLE"
    | "MISSION"
    | "MENTOR"
    | "CITY"
    | "REPORT";
  correlationId?: string;
  metadata?: GameEventMetadata;
}

export interface SerializedGameEvent {
  id: string;
  playerId: string;
  type: GameEventType;
  occurredAt: string;
  source: GameEvent["source"];
  correlationId?: string;
  metadata?: GameEventMetadata;
}

export function serializeGameEvent(event: GameEvent): SerializedGameEvent {
  return {
    ...event,
    occurredAt: event.occurredAt.toISOString(),
  };
}
