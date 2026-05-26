import type { Transaction } from "../types/transaction.js";
import { formatDateTime, transactionTypeLabel } from "../utils/formatters.js";
import { formatMoneyFromCents } from "../utils/money.js";
import { EmptyState } from "./EmptyState.js";

export function TransactionList({
  transactions,
}: {
  transactions: Transaction[];
}) {
  if (transactions.length === 0) {
    return (
      <EmptyState
        title="Historico vazio"
        description="Compras, vendas, rendimentos e eventos de mercado aparecerao aqui quando existirem."
      />
    );
  }

  return (
    <ol className="timeline">
      {transactions.map((transaction) => (
        <li key={transaction.id}>
          <span>{transactionTypeLabel(transaction.type)}</span>
          <div>
            <strong>{transaction.description}</strong>
            <p>
              {transaction.assetSymbol ? `${transaction.assetSymbol} · ` : ""}
              {formatMoneyFromCents(transaction.amountCents)}
              {transaction.quantity
                ? ` · ${transaction.quantity} unidade(s)`
                : ""}
            </p>
            <small>
              {formatDateTime(transaction.createdAt)} · saldo apos evento:{" "}
              {formatMoneyFromCents(transaction.balanceAfterCents)}
            </small>
          </div>
        </li>
      ))}
    </ol>
  );
}
