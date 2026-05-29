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
        description="Compre um ativo ou colete rendimentos para gerar eventos e revisar sua jornada financeira."
      />
    );
  }

  return (
    <ol className="timeline">
      {transactions.map((transaction) => {
        const label = transactionTypeLabel(transaction.type);
        const showTechnicalCode = label !== transaction.type;

        return (
          <li key={transaction.id}>
            <div className="timeline-type">
              <span>{label}</span>
              {showTechnicalCode ? <small>{transaction.type}</small> : null}
            </div>
            <div className="timeline-content">
              <strong>{transaction.description}</strong>
              <dl className="transaction-details">
                {transaction.assetSymbol ? (
                  <div>
                    <dt>Ativo</dt>
                    <dd>{transaction.assetSymbol}</dd>
                  </div>
                ) : null}
                <div>
                  <dt>Valor</dt>
                  <dd>{formatMoneyFromCents(transaction.amountCents)}</dd>
                </div>
                {transaction.quantity ? (
                  <div>
                    <dt>Quantidade</dt>
                    <dd>{transaction.quantity} unidade(s)</dd>
                  </div>
                ) : null}
              </dl>
              <small>
                {formatDateTime(transaction.createdAt)} - saldo apos evento:{" "}
                {formatMoneyFromCents(transaction.balanceAfterCents)}
              </small>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
