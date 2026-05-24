import { apiClient } from "./apiClient.js";
import type { Transaction } from "../types/transaction.js";

type TransactionResponse = {
  id: string;
  type: string;
  symbol?: string;
  quantity?: number;
  unitPriceCents?: number;
  totalCents: number;
  balanceAfterCents: number;
  occurredAt: string;
};

type TransactionsListResponse = {
  items: TransactionResponse[];
};

function describeTransaction(transaction: TransactionResponse): string {
  if (transaction.type === "BUY") {
    return "Compra registrada no historico financeiro.";
  }
  if (transaction.type === "SELL") {
    return "Venda registrada como ajuste de carteira.";
  }
  if (transaction.type === "INCOME_COLLECTED" || transaction.type === "INCOME") {
    return "Rendimento simulado coletado.";
  }
  if (transaction.type === "MARKET_EVENT") {
    return "Evento de mercado simulado.";
  }
  return "Evento financeiro registrado.";
}

export async function getTransactions(playerId: string): Promise<Transaction[]> {
  const response = await apiClient<TransactionsListResponse>(
    `/players/${playerId}/transactions`,
  );
  return response.items.map((transaction) => ({
    id: transaction.id,
    type: transaction.type,
    assetSymbol: transaction.symbol,
    quantity: transaction.quantity,
    unitPriceCents: transaction.unitPriceCents,
    amountCents: transaction.totalCents,
    balanceAfterCents: transaction.balanceAfterCents,
    description: describeTransaction(transaction),
    createdAt: transaction.occurredAt,
  }));
}
