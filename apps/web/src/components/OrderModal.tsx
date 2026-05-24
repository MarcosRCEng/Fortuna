import type { Asset } from "../types/asset.js";
import type { Position } from "../types/wallet.js";
import {
  calculateOrderTotalCents,
  formatMoneyFromCents,
  parsePositiveWholeQuantity,
} from "../utils/money.js";

export type OrderMode = "buy" | "sell";

export function OrderModal({
  mode,
  asset,
  position,
  availableCashCents,
  quantityInput,
  submitting,
  onQuantityChange,
  onCancel,
  onConfirm,
}: {
  mode: OrderMode;
  asset: Asset;
  position?: Position;
  availableCashCents: number;
  quantityInput: string;
  submitting: boolean;
  onQuantityChange(value: string): void;
  onCancel(): void;
  onConfirm(quantity: number): void;
}) {
  const quantity = parsePositiveWholeQuantity(quantityInput);
  const totalCents = calculateOrderTotalCents(asset.currentPriceCents, quantity);
  const validationMessage = validateOrder({
    mode,
    quantity,
    totalCents,
    availableCashCents,
    position,
  });

  return (
    <div className="modal-backdrop">
      <section className="modal" aria-modal="true" role="dialog">
        <div className="section-heading">
          <div>
            <span className="section-kicker">
              {mode === "buy" ? "Ordem de compra" : "Ordem de venda"}
            </span>
            <h2>{asset.name}</h2>
          </div>
          <strong>{asset.symbol}</strong>
        </div>
        <label>
          Quantidade
          <input
            inputMode="numeric"
            pattern="[0-9]*"
            value={quantityInput}
            onChange={(event) => onQuantityChange(event.target.value)}
          />
        </label>
        <dl className="data-grid modal-summary">
          <div>
            <dt>Preco unitario</dt>
            <dd>{formatMoneyFromCents(asset.currentPriceCents)}</dd>
          </div>
          <div>
            <dt>{mode === "buy" ? "Custo total" : "Valor estimado"}</dt>
            <dd>{formatMoneyFromCents(totalCents)}</dd>
          </div>
          <div>
            <dt>Saldo disponivel</dt>
            <dd>{formatMoneyFromCents(availableCashCents)}</dd>
          </div>
          <div>
            <dt>Posicao atual</dt>
            <dd>{position?.quantity ?? 0}</dd>
          </div>
        </dl>
        <p className="educational-note">
          {mode === "buy"
            ? "Comprar um ativo compromete parte do saldo disponivel. Avalie sua estrategia simulada."
            : "Vender altera sua composicao de carteira e pode reduzir sua exposicao a determinado ativo."}
        </p>
        {validationMessage ? (
          <div className="state state-blocked" role="alert">
            <strong>Operacao bloqueada</strong>
            <p>{validationMessage}</p>
          </div>
        ) : null}
        <div className="modal-actions">
          <button type="button" className="button button-ghost" onClick={onCancel}>
            Cancelar
          </button>
          <button
            type="button"
            className="button button-primary"
            disabled={Boolean(validationMessage) || submitting}
            onClick={() => onConfirm(quantity)}
          >
            {mode === "buy" ? "Confirmar compra" : "Confirmar venda"}
          </button>
        </div>
      </section>
    </div>
  );
}

function validateOrder({
  mode,
  quantity,
  totalCents,
  availableCashCents,
  position,
}: {
  mode: OrderMode;
  quantity: number;
  totalCents: number;
  availableCashCents: number;
  position?: Position;
}): string | undefined {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return "Informe uma quantidade inteira maior que zero.";
  }
  if (totalCents <= 0) {
    return "O valor total da ordem precisa ser maior que zero.";
  }
  if (mode === "buy" && totalCents > availableCashCents) {
    return "Saldo insuficiente para concluir esta compra.";
  }
  if (mode === "sell" && quantity > (position?.quantity ?? 0)) {
    return "Voce nao possui quantidade suficiente para vender este ativo.";
  }
  return undefined;
}
