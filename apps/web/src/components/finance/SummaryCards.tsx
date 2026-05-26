import { formatFortuna, formatMoney } from "../../financial/money.js";
import type { WalletSummary } from "../../services/types.js";

export function BalanceCard({ wallet }: { wallet: WalletSummary }) {
  return (
    <article className="metric-card metric-card-balance">
      <span>Saldo disponivel</span>
      <strong>{formatMoney(wallet.availableBalanceCents)}</strong>
      <small>{formatFortuna(wallet.availableBalanceCents)} para decisoes futuras</small>
    </article>
  );
}

export function EquityCard({ wallet }: { wallet: WalletSummary }) {
  return (
    <article className="metric-card metric-card-equity">
      <span>Patrimonio total</span>
      <strong>{formatMoney(wallet.totalEquityCents)}</strong>
      <small>Saldo mais valor estimado das posicoes</small>
    </article>
  );
}

export function InvestedCard({ wallet }: { wallet: WalletSummary }) {
  return (
    <article className="metric-card">
      <span>Valor investido</span>
      <strong>{formatMoney(wallet.investedValueCents)}</strong>
      <small>{wallet.positionCount} posicoes acompanhadas</small>
    </article>
  );
}
