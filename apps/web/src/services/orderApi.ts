import { apiClient } from "./apiClient.js";
import type { OrderExecution } from "../types/transaction.js";

type OrderExecutionResponse = Omit<OrderExecution, "quantity"> & {
  quantity: string;
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
    `/players/${playerId}/orders/buy`,
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
    `/players/${playerId}/orders/sell`,
    {
      method: "POST",
      body: JSON.stringify({ assetId, quantity: String(quantity) }),
    },
  );
  return mapOrder(response);
}
