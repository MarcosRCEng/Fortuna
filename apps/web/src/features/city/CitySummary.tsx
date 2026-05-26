import { MetricCard } from "../../components/MetricCard.js";
import { formatMoneyFromCents } from "../../utils/money.js";

export function CitySummary({
  cityLevel,
  totalEquityCents,
  completedMissionsCount,
  totalMissionsCount,
  diversificationCount,
  collectedIncomeCents,
}: {
  cityLevel: number;
  totalEquityCents: number;
  completedMissionsCount: number;
  totalMissionsCount: number;
  diversificationCount: number;
  collectedIncomeCents: number;
}) {
  return (
    <section className="metric-grid" aria-label="Resumo da Cidade Fortuna">
      <MetricCard
        title="Nivel geral da cidade"
        value={`Nivel ${cityLevel}/5`}
        description="Combinacao educativa de patrimonio, missoes, diversificacao e consistencia."
      />
      <MetricCard
        title="Patrimonio simulado"
        value={formatMoneyFromCents(totalEquityCents)}
        description="Tratado internamente em centavos inteiros."
      />
      <MetricCard
        title="Missoes concluidas"
        value={`${completedMissionsCount}/${totalMissionsCount}`}
        description="Aprendizado aplicado tambem fortalece a cidade."
      />
      <MetricCard
        title="Diversificacao"
        value={`${diversificationCount} classes`}
        description="Quantidade de dimensoes financeiras com algum progresso."
      />
      <MetricCard
        title="Rendimentos coletados"
        value={formatMoneyFromCents(collectedIncomeCents)}
        description="Representa acompanhamento de renda recorrente simulada."
      />
    </section>
  );
}
