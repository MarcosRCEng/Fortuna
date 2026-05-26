import type { AllocationItem } from "../types/finance.js";
import { formatMoneyFromCents } from "../utils/money.js";
import { assetTypeLabel } from "../utils/risk.js";

const colors = ["#2f6f4e", "#365f91", "#9a6f2c", "#7c8a9a", "#5f6fb5"];

export function AllocationBar({ items }: { items: AllocationItem[] }) {
  const visibleItems = items.filter((item) => item.valueCents > 0);
  if (visibleItems.length === 0) {
    return (
      <p className="educational-note">
        A alocacao aparece quando a carteira tiver posicoes.
      </p>
    );
  }

  return (
    <div className="allocation-block">
      <div className="allocation-bar" aria-label="Alocacao por classe">
        {visibleItems.map((item, index) => (
          <span
            key={`${item.assetType ?? item.symbol ?? index}`}
            style={{
              width: `${Math.max(item.percentage, 2)}%`,
              backgroundColor: colors[index % colors.length],
            }}
          />
        ))}
      </div>
      <div className="allocation-list">
        {visibleItems.map((item, index) => (
          <div key={`${item.assetType ?? item.symbol ?? index}`}>
            <i style={{ backgroundColor: colors[index % colors.length] }} />
            <span>{assetTypeLabel(item.assetType ?? item.symbol)}</span>
            <strong>
              {item.percentage.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
              % · {formatMoneyFromCents(item.valueCents)}
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
}
