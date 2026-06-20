import { apiClient } from "./apiClient.js";
import type { OrderExecution } from "../types/transaction.js";

type OrderExecutionResponse = Omit<OrderExecution, "quantity"> & {
  quantity: string;
};

export type BuySimulationAlert = {
  code: string;
  severity: "INFO" | "ATTENTION" | "HIGH";
  message: string;
  basisPoints: number;
};

export type BuySimulation = {
  playerId: string;
  assetId: string;
  symbol: string;
  assetType: string;
  quantity: number;
  unitPriceCents: number;
  totalCostCents: number;
  currentBalanceCents: number;
  projectedBalanceCents: number;
  currentInvestedValueCents: number;
  projectedInvestedValueCents: number;
  currentTotalEquityCents: number;
  projectedTotalEquityCents: number;
  projectedPosition: {
    symbol: string;
    assetType: string;
    currentQuantity: number;
    projectedQuantity: number;
    currentAveragePriceCents: number | null;
    projectedAveragePriceCents: number;
    currentMarketValueCents: number;
    projectedMarketValueCents: number;
  };
  concentration: {
    currentAssetBasisPoints: number;
    projectedAssetBasisPoints: number;
    currentAssetTypeBasisPoints: number;
    projectedAssetTypeBasisPoints: number;
  };
  alerts: BuySimulationAlert[];
  canProceed: true;
};

function mapOrder(response: OrderExecutionResponse): OrderExecution {
  return {
    ...response,
    quantity: Number.parseInt(response.quantity, 10),
  };
}

export async function buyAsset(
  playerId: string,
  assetId: string,
  quantity: number,
): Promise<OrderExecution> {
  const response = await apiClient<OrderExecutionResponse>(
    playerId === "me" ? "/me/orders/buy" : `/players/${playerId}/orders/buy`,
    {
      method: "POST",
      body: JSON.stringify({ assetId, quantity: String(quantity) }),
    },
  );
  return mapOrder(response);
}

export async function sellAsset(
  playerId: string,
  assetId: string,
  quantity: number,
): Promise<OrderExecution> {
  const response = await apiClient<OrderExecutionResponse>(
    playerId === "me" ? "/me/orders/sell" : `/players/${playerId}/orders/sell`,
    {
      method: "POST",
      body: JSON.stringify({ assetId, quantity: String(quantity) }),
    },
  );
  return mapOrder(response);
}

export function simulateBuyAsset(
  assetId: string,
  quantity: number,
): Promise<BuySimulation> {
  return apiClient<BuySimulation>("/me/orders/buy/simulation", {
    method: "POST",
    body: JSON.stringify({ assetId, quantity: String(quantity) }),
  });
}
