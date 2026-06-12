import { useMemo, useState } from "react";
import type { CityStateResponse } from "../../services/cityApi.js";
import type { PlayerMission } from "../../services/missionApi.js";
import type { PlayerSummary } from "../../types/player.js";
import type { Transaction } from "../../types/transaction.js";
import type { Portfolio, PortfolioAllocation } from "../../types/wallet.js";
import { featureFlags } from "../../config/featureFlags.js";
import { CityCardsExperience } from "./CityCardsExperience.js";
import { CityBuildingsGrid } from "./CityBuildingsGrid.js";
import { CitySummary } from "./CitySummary.js";
import { createCityEducationalTips } from "./cityEducationalTips.js";
import { deriveCityBuildings } from "./city.rules.js";
import type { DeriveCityInput } from "./city.types.js";
import type { CityBuildingViewModel } from "./city.types.js";
import { CityBuildingDetailsModal } from "./components/CityBuildingDetailsModal.js";
import { CityEducationalTips } from "./components/CityEducationalTips.js";
import { CityScene } from "./components/CityScene.js";

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
  const [selectedBuilding, setSelectedBuilding] =
    useState<CityBuildingViewModel | null>(null);
  const input = useMemo(
    () =>
      createCityInput({
        summary,
        cityState,
        portfolio,
        allocation,
        transactions,
        missions,
      }),
    [summary, cityState, portfolio, allocation, transactions, missions],
  );
  const buildings = useMemo(() => deriveCityBuildings(input), [input]);
  const educationalTips = useMemo(
    () => createCityEducationalTips({ input, missions, transactions }),
    [input, missions, transactions],
  );
  const cityLevel = cityState?.level ?? deriveConceptualCityLevel(buildings);
  const diversificationCount = [
    input.availableBalanceCents > 0,
    ...input.allocationByClass.map((item) => item.valueCents > 0),
  ].filter(Boolean).length;
  const totalMissionsCount = Math.max(
    input.totalMissionsCount,
    input.completedMissionsCount,
  );
  const inProgressMissionsCount = missions.filter(
    (mission) => mission.status === "IN_PROGRESS",
  ).length;
  const isIsometricCityEnabled = featureFlags.enableIsometricCity;

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
        <span className="city-maturity-badge">
          Maturidade financeira em construcao
        </span>
      </header>

      {isIsometricCityEnabled ? (
        <>
          <CitySummary
            cityLevel={cityLevel}
            totalEquityCents={input.totalEquityCents}
            completedMissionsCount={input.completedMissionsCount}
            totalMissionsCount={totalMissionsCount}
            diversificationCount={diversificationCount}
            collectedIncomeCents={input.collectedIncomeCents}
          />

          <CityEducationalTips tips={educationalTips} />

          <CityScene
            buildings={buildings}
            onBuildingClick={setSelectedBuilding}
          />

          <section className="panel city-guidance">
            <div>
              <span className="section-kicker">Leitura educativa</span>
              <h2>Construcoes como sinais de maturidade</h2>
              <p>
                Os cards abaixo traduzem dados da jornada em sinais visuais
                sobre liquidez, risco, conhecimento e consistencia.
              </p>
            </div>
          </section>

          <CityBuildingsGrid buildings={buildings} />

          {selectedBuilding ? (
            <CityBuildingDetailsModal
              building={selectedBuilding}
              onClose={() => setSelectedBuilding(null)}
            />
          ) : null}
        </>
      ) : null}

      {!isIsometricCityEnabled ? (
        <CityCardsExperience
          summary={summary}
          input={input}
          buildings={buildings}
          educationalTips={educationalTips}
          stats={{
            cityLevel,
            playerLevel: safeWhole(summary?.level ?? cityLevel),
            playerProgressPercent: safePercent(summary?.progressPercent),
            availableBalanceCents: input.availableBalanceCents,
            totalEquityCents: input.totalEquityCents,
            assetsCount: input.positionsCount,
            completedMissionsCount: input.completedMissionsCount,
            totalMissionsCount,
            inProgressMissionsCount,
            collectibleIncomeCents: input.collectibleIncomeCents,
            diversificationCount,
          }}
        />
      ) : null}
    </>
  );
}

function createCityInput({
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
    .filter(
      (transaction) =>
        transaction.type === "INCOME" ||
        transaction.type === "INCOME_COLLECTED",
    )
    .reduce((sum, transaction) => sum + safeCents(transaction.amountCents), 0);

  return {
    totalEquityCents: Math.max(
      safeCents(summary?.totalEquityCents),
      safeCents(cityState?.totalPatrimonyCents),
    ),
    availableBalanceCents: safeCents(summary?.availableCashCents),
    allocationByClass: (allocation?.byAssetType ?? []).map((item) => ({
      assetClass: item.assetType ?? "UNKNOWN",
      percentage: safePercent(item.percentage),
      valueCents: safeCents(item.valueCents),
    })),
    positionsCount: portfolio?.positions.length ?? 0,
    completedMissionsCount: Math.max(
      completedMissionsCount,
      safeWhole(cityState?.completedMissionsCount),
    ),
    totalMissionsCount,
    collectedIncomeCents: Math.max(
      safeCents(summary?.totalIncomeCollectedCents),
      collectedIncomeFromTransactions,
    ),
    collectibleIncomeCents: Math.max(
      safeCents(summary?.collectibleIncomeCents ?? 0),
      safeCents(cityState?.collectableIncomeCents),
    ),
    mentorMessagesCount: summary?.mentorMessage ? 1 : 0,
    hasConcentrationWarning: largestPositionPercentage >= 75,
    largestPositionPercentage,
  };
}

function deriveConceptualCityLevel(buildings: CityBuildingViewModel[]): number {
  if (buildings.length === 0) {
    return 0;
  }

  const averageBuildingLevel =
    buildings.reduce((sum, building) => sum + building.level, 0) /
    buildings.length;

  return Math.max(0, Math.min(5, Math.round((averageBuildingLevel / 3) * 5)));
}

function safeCents(value: number | null | undefined): number {
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : 0;
}

function safeWhole(value: number | null | undefined): number {
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : 0;
}

function safePercent(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}
