import { TransactionList } from "../components/TransactionList.js";
import type { Transaction } from "../types/transaction.js";

export function HistoryPage({ transactions }: { transactions: Transaction[] }) {
  return (
    <>
      <header className="page-header">
        <div>
          <span className="section-kicker">Historico</span>
          <h1>Rastreabilidade das operacoes.</h1>
          <p>
            Toda operacao financeira valida aparece aqui para apoiar revisao e
            aprendizado.
          </p>
        </div>
      </header>
      <section className="panel">
        <TransactionList transactions={transactions} />
      </section>
    </>
  );
}
