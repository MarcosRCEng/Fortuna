import { useMemo } from "react";
import type { CityStateResponse } from "../../services/cityApi.js";
import type { PlayerMission } from "../../services/missionApi.js";
import type { PlayerSummary } from "../../types/player.js";
import type { Transaction } from "../../types/transaction.js";
import type { Portfolio, PortfolioAllocation } from "../../types/wallet.js";
import { CityBuildingsGrid } from "./CityBuildingsGrid.js";
import { CitySummary } from "./CitySummary.js";
import { deriveCityBuildings } from "./city.rules.js";
import type { DeriveCityInput } from "./city.types.js";

export function CityPage({
  summary,
  cityState,
  portfolio,
  allocation,
  transactions,
  missions,
}: {
  summary?: PlayerSummary;
  cityState?: CityStateResponse;
  portfolio?: Portfolio;
  allocation?: PortfolioAllocation;
  transactions: Transaction[];
  missions: PlayerMission[];
}) {
  const input = useMemo(
    () =>
      createCityInput({
        summary,
        portfolio,
        allocation,
        transactions,
        missions,
      }),
    [summary, portfolio, allocation, transactions, missions],
  );
  const buildings = useMemo(() => deriveCityBuildings(input), [input]);
  const cityLevel = Math.max(
    0,
    Math.round(
      buildings.reduce((sum, building) => sum + building.level, 0) / buildings.length,
    ),
  );
  const diversificationCount = [
    input.availableBalanceCents > 0,
    ...input.allocationByClass.map((item) => item.valueCents > 0),
  ].filter(Boolean).length;

  return (
    <>
      <header className="page-header city-page-header">
        <div>
          <span className="section-kicker">Cidade Fortuna</span>
          <h1>Cidade Fortuna</h1>
          <p>
            Sua cidade evolui conforme sua maturidade financeira cresce por meio
            de aprendizado, organizacao, diversificacao e acompanhamento.
          </p>
        </div>
        <span className="city-maturity-badge">Maturidade financeira em construcao</span>
      </header>

      <CitySummary
        cityLevel={cityState?.level ?? cityLevel}
        totalEquityCents={input.totalEquityCents}
        completedMissionsCount={input.completedMissionsCount}
        totalMissionsCount={input.totalMissionsCount}
        diversificationCount={diversificationCount}
        collectedIncomeCents={input.collectedIncomeCents}
      />

      <section className="panel city-guidance">
        <div>
          <span className="section-kicker">Leitura educativa</span>
          <h2>Construcoes como sinais de maturidade</h2>
          <p>
            Os cards abaixo nao prometem ganhos. Eles traduzem dados da jornada
            em sinais visuais sobre liquidez, risco, conhecimento e consistencia.
          </p>
        </div>
      </section>

      <CityBuildingsGrid buildings={buildings} />
    </>
  );
}

function createCityInput({
  summary,
  portfolio,
  allocation,
  transactions,
  missions,
}: {
  summary?: PlayerSummary;
  portfolio?: Portfolio;
  allocation?: PortfolioAllocation;
  transactions: Transaction[];
  missions: PlayerMission[];
}): DeriveCityInput {
  const completedMissionsCount = missions.filter(
    (mission) => mission.status === "COMPLETED" || mission.status === "CLAIMED",
  ).length;
  const totalMissionsCount = missions.length;
  const largestPositionPercentage = Math.max(
    0,
    ...((allocation?.byAsset ?? []).map((item) => item.percentage) ?? []),
  );
  const collectedIncomeFromTransactions = transactions
    .filter((transaction) => transaction.type === "INCOME" || transaction.type === "INCOME_COLLECTED")
    .reduce((sum, transaction) => sum + safeCents(transaction.amountCents), 0);

  return {
    totalEquityCents: safeCents(summary?.totalEquityCents),
    availableBalanceCents: safeCents(summary?.availableCashCents),
    allocationByClass: (allocation?.byAssetType ?? []).map((item) => ({
      assetClass: item.assetType ?? "UNKNOWN",
      percentage: safePercent(item.percentage),
      valueCents: safeCents(item.valueCents),
    })),
    positionsCount: portfolio?.positions.length ?? 0,
    completedMissionsCount,
    totalMissionsCount,
    collectedIncomeCents: Math.max(
      safeCents(summary?.totalIncomeCollectedCents),
      collectedIncomeFromTransactions,
    ),
    collectibleIncomeCents: safeCents(summary?.collectibleIncomeCents ?? 0),
    mentorMessagesCount: summary?.mentorMessage ? 1 : 0,
    hasConcentrationWarning: largestPositionPercentage >= 75,
    largestPositionPercentage,
  };
}

function safeCents(value: number | null | undefined): number {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : 0;
}

function safePercent(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}
