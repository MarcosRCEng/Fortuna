import type {
  AssetBought,
  AssetSold,
  FinancialEvent,
  IncomeCollected,
} from "@fortuna/domain";
import type { AppEvent, DomainEvent } from "./AppEvent.js";

export interface FinancialEventMappingContext {
  correlationId?: string;
  causationId?: string;
  eventId: () => string;
  source?: string;
}

export function toAppEvents(
  events: FinancialEvent[],
  context: FinancialEventMappingContext,
): AppEvent[] {
  return events.flatMap((event) => {
    if (event.type === "AssetBought") {
      return [mapAssetBought(event, context), mapTransactionCreated(event, context)];
    }

    if (event.type === "AssetSold") {
      return [mapAssetSold(event, context), mapTransactionCreated(event, context)];
    }

    if (event.type === "YieldCollected" || event.type === "IncomeCollected") {
      return [
        mapYieldCollected(event, context),
        mapTransactionCreated(event, context),
      ];
    }

    if (event.type === "YieldGenerated") {
      return [mapYieldGenerated(event, context)];
    }

    return [];
  });
}

function metadata(context: FinancialEventMappingContext) {
  return {
    correlationId: context.correlationId ?? context.eventId(),
    causationId: context.causationId,
    source: context.source ?? "financial-domain",
    version: 1,
  };
}

function mapAssetBought(
  event: AssetBought,
  context: FinancialEventMappingContext,
): DomainEvent {
  return {
    id: context.eventId(),
    type: "AssetBought",
    playerId: event.playerId,
    occurredAt: event.occurredAt,
    metadata: metadata(context) as DomainEvent["metadata"],
    payload: {
      playerId: event.playerId,
      walletId: event.walletId,
      assetId: event.asset.id,
      assetSymbol: event.asset.symbol.value,
      assetType: event.asset.type,
      quantity: event.quantity.units,
      unitPriceCents: event.unitPrice.cents,
      totalAmountCents: event.total.cents,
      transactionId: event.transactionId,
    },
  };
}

function mapAssetSold(
  event: AssetSold,
  context: FinancialEventMappingContext,
): DomainEvent {
  return {
    id: context.eventId(),
    type: "AssetSold",
    playerId: event.playerId,
    occurredAt: event.occurredAt,
    metadata: metadata(context) as DomainEvent["metadata"],
    payload: {
      playerId: event.playerId,
      walletId: event.walletId,
      assetId: event.asset.id,
      assetSymbol: event.asset.symbol.value,
      assetType: event.asset.type,
      quantity: event.quantity.units,
      unitPriceCents: event.unitPrice.cents,
      totalAmountCents: event.total.cents,
      transactionId: event.transactionId,
    },
  };
}

function mapYieldCollected(
  event: IncomeCollected,
  context: FinancialEventMappingContext,
): DomainEvent {
  return {
    id: context.eventId(),
    type: "YieldCollected",
    playerId: event.playerId,
    occurredAt: event.occurredAt,
    metadata: metadata(context) as DomainEvent["metadata"],
    payload: {
      playerId: event.playerId,
      assetId: event.asset.id,
      assetSymbol: event.asset.symbol.value,
      yieldAmountCents: event.total.cents,
      transactionId: event.transactionId,
      pendingYieldId: event.incomeEventId,
    },
  };
}

function mapYieldGenerated(
  event: Extract<FinancialEvent, { type: "YieldGenerated" }>,
  context: FinancialEventMappingContext,
): DomainEvent {
  return {
    id: context.eventId(),
    type: "YieldGenerated",
    playerId: event.playerId,
    occurredAt: event.occurredAt,
    metadata: metadata(context) as DomainEvent["metadata"],
    payload: {
      playerId: event.playerId,
      assetId: event.asset.id,
      assetSymbol: event.asset.symbol.value,
      yieldAmountCents: event.total.cents,
      yieldType: event.yieldType,
      dueCycle: event.dueCycle,
      pendingYieldId: event.incomeEventId,
    },
  };
}

function mapTransactionCreated(
  event: AssetBought | AssetSold | IncomeCollected,
  context: FinancialEventMappingContext,
): DomainEvent {
  return {
    id: context.eventId(),
    type: "TransactionCreated",
    playerId: event.playerId,
    occurredAt: event.occurredAt,
    metadata: metadata(context) as DomainEvent["metadata"],
    payload: {
      playerId: event.playerId,
      transactionId: event.transactionId,
      transactionType:
        event.type === "AssetBought"
          ? "BUY"
          : event.type === "AssetSold"
            ? "SELL"
            : "INCOME_COLLECTED",
      amountCents: event.total.cents,
      relatedAssetId: event.asset.id,
      createdAt: event.occurredAt.toISOString(),
    },
  };
}
