import { formatMoney } from "../../financial/money.js";
import type { AssetClass, Position } from "../../services/types.js";

const labels: Record<AssetClass, string> = {
  CASH: "Caixa",
  FIXED_INCOME: "Renda fixa",
  FII: "FII",
  STOCK: "Acoes",
};

const colors: Record<AssetClass, string> = {
  CASH: "#7c8a9a",
  FIXED_INCOME: "#2f6f4e",
  FII: "#8a6a2f",
  STOCK: "#365f91",
};

export function AllocationChart({
  positions,
  cashCents,
}: {
  positions: Position[];
  cashCents: number;
}) {
  const buckets = new Map<AssetClass, number>([["CASH", cashCents]]);
  for (const position of positions) {
    buckets.set(
      position.assetClass,
      (buckets.get(position.assetClass) ?? 0) + position.marketValueCents,
    );
  }

  const total = [...buckets.values()].reduce((sum, value) => sum + value, 0);
  const rows = [...buckets.entries()].filter(([, value]) => value > 0);
  const gradient = rows
    .reduce<{ cursor: number; stops: string[] }>(
      (state, [assetClass, value]) => {
        const width = total === 0 ? 0 : Math.round((value / total) * 100);
        const next = Math.min(100, state.cursor + width);
        state.stops.push(
          `${colors[assetClass]} ${state.cursor}% ${next}%`,
        );
        state.cursor = next;
        return state;
      },
      { cursor: 0, stops: [] },
    )
    .stops.join(", ");

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <span className="section-kicker">Alocacao</span>
          <h2>Distribuicao por classe</h2>
        </div>
      </div>
      <div
        className="allocation-ring"
        style={{ background: `conic-gradient(${gradient})` }}
        aria-label="Grafico simples de alocacao por classe"
      >
        <span>{total === 0 ? "0%" : "100%"}</span>
      </div>
      <div className="allocation-list">
        {rows.map(([assetClass, value]) => (
          <div key={assetClass}>
            <i style={{ backgroundColor: colors[assetClass] }} />
            <span>{labels[assetClass]}</span>
            <strong>{formatMoney(value)}</strong>
          </div>
        ))}
      </div>
      <p className="educational-note">
        Diversificacao nao elimina risco, mas reduz dependencia de um unico
        ativo, setor ou prazo.
      </p>
    </section>
  );
}
