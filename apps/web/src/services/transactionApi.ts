import { apiClient } from "./apiClient.js";
import type { Transaction } from "../types/transaction.js";
import { transactionTypeLabel } from "../utils/formatters.js";

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

type GameLoopHistoryResponse = {
  history: {
    latest: Array<{
      id: string;
      type: string;
      title: string;
      description: string;
      amountCents?: number;
      occurredAt: string;
    }>;
  };
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

function describeGameplayEvent(event: GameLoopHistoryResponse["history"]["latest"][number]): string {
  const friendlyTitle = looksTechnical(event.title)
    ? transactionTypeLabel(event.type)
    : event.title;
  const description = event.description.replace(`${event.type}: `, "");

  return friendlyTitle === description
    ? description
    : `${friendlyTitle}: ${description}`;
}

function looksTechnical(value: string): boolean {
  return /^[A-Z0-9_]+$/.test(value);
}

export async function getTransactions(playerId: string): Promise<Transaction[]> {
  const [response, gameLoopState] = await Promise.all([
    apiClient<TransactionsListResponse>(
      playerId === "me" ? "/me/transactions" : `/players/${playerId}/transactions`,
    ),
    apiClient<GameLoopHistoryResponse>(
      playerId === "me"
        ? "/me/game-loop/state"
        : `/players/${playerId}/game-loop/state`,
    ).catch(() => undefined),
  ]);
  const financialTransactions = response.items.map((transaction) => ({
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
  const gameplayEvents =
    gameLoopState?.history.latest
      .filter((event) => !financialTransactions.some((item) => item.id === event.id))
      .map((event) => ({
        id: event.id,
        type: event.type,
        amountCents: event.amountCents ?? 0,
        balanceAfterCents: 0,
        description: describeGameplayEvent(event),
        createdAt: event.occurredAt,
      })) ?? [];

  return [...financialTransactions, ...gameplayEvents].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}
