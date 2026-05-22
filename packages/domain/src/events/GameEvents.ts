export const GAME_EVENT_TYPES = [
  "FIRST_BUY",
  "FIRST_SELL",
  "FIRST_INCOME_RECEIVED",
  "FIRST_DIVERSIFICATION",
  "NET_WORTH_REACHED",
  "MISSION_COMPLETED",
  "EMERGENCY_RESERVE_STARTED",
  "EMERGENCY_RESERVE_COMPLETED",
  "EXCESSIVE_CONCENTRATION_DETECTED",
  "NEW_DISTRICT_UNLOCKED",
  "NEW_ASSET_CLASS_UNLOCKED",
  "NEW_TOOL_UNLOCKED",
  "MARKET_CYCLE_ADVANCED",
  "PLAYER_LEVEL_UP",
  "EDUCATIONAL_BADGE_GRANTED",
] as const;

export type GameEventType = (typeof GAME_EVENT_TYPES)[number];

export type GameEventMetadataValue = string | number | boolean;

export type GameEventMetadata = Record<string, GameEventMetadataValue>;

export interface GameEvent {
  id: string;
  playerId: string;
  type: GameEventType;
  occurredAt: Date;
  source: "GAMEPLAY" | "FINANCIAL_EVENT" | "MARKET_CYCLE" | "MISSION";
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
