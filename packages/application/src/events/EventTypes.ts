export const EVENT_TYPES = {
  AssetBought: "AssetBought",
  AssetSold: "AssetSold",
  YieldGenerated: "YieldGenerated",
  YieldCollected: "YieldCollected",
  TransactionCreated: "TransactionCreated",
  MarketPricesUpdated: "MarketPricesUpdated",
  PortfolioEvaluated: "PortfolioEvaluated",
  CycleAdvanced: "CycleAdvanced",
  MissionProgressUpdated: "MissionProgressUpdated",
  MissionCompleted: "MissionCompleted",
  MentorTipGenerated: "MentorTipGenerated",
  CityStateUpdated: "CityStateUpdated",
  CityRefreshRequested: "CityRefreshRequested",
  FlowCompleted: "FlowCompleted",
  FlowFailed: "FlowFailed",
} as const;

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];
