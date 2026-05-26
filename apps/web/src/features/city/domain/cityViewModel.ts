import { cityLayout } from "../data/cityLayout.js";
import type {
  CityDistrict,
  CityFinancialSnapshot,
  CityViewModel,
} from "./cityTypes.js";
import {
  isDistrictUnlocked,
  isPortfolioConcentrated,
  resolveCityLevel,
  resolveDistrictLevel,
  resolveDistrictState,
  resolveMaturityLabel,
} from "./cityRules.js";

export function createCityViewModel(
  snapshot: CityFinancialSnapshot,
): CityViewModel {
  const cityLevel = resolveCityLevel(snapshot);

  const districts: CityDistrict[] = cityLayout.map((layoutDistrict) => {
    const unlocked = isDistrictUnlocked(layoutDistrict.type, snapshot);
    const level = resolveDistrictLevel(layoutDistrict.type, snapshot);
    const district: CityDistrict = {
      id: layoutDistrict.id,
      type: layoutDistrict.type,
      name: layoutDistrict.name,
      description: layoutDistrict.description,
      position: layoutDistrict.position,
      level,
      unlocked,
      state: "locked",
      mentorHint: layoutDistrict.mentorHint,
      buildings: layoutDistrict.buildingNames.map((name, index) => ({
        id: `${layoutDistrict.id}-building-${index + 1}`,
        name,
        districtType: layoutDistrict.type,
        level,
        state: "locked",
      })),
    };
    const state = resolveDistrictState(district, snapshot);

    return {
      ...district,
      state,
      buildings: district.buildings.map((building) => ({ ...building, state })),
    };
  });

  const alerts: string[] = [];
  if (snapshot.cashBalanceCents <= 0) {
    alerts.push("Sua reserva ainda nao apareceu na cidade. Comece pela base de liquidez.");
  }
  if (snapshot.riskLevel === "high") {
    alerts.push("O Mentor recomenda observar risco elevado antes de ampliar posicoes.");
  }
  if (isPortfolioConcentrated(snapshot)) {
    alerts.push("Carteira concentrada: diversificar pode equilibrar melhor os distritos.");
  }

  const highlights: string[] = [];
  if (snapshot.hasYieldToCollect) {
    highlights.push("Voce possui rendimentos disponiveis para revisar.");
  }
  if (snapshot.completedMissions > 0) {
    highlights.push("Missoes concluidas melhoraram a Academia Fortuna.");
  }
  if (snapshot.assetCount >= 3) {
    highlights.push("Sua cidade ja representa mais de um tipo de decisao financeira.");
  }

  return {
    cityLevel,
    maturityLabel: resolveMaturityLabel(snapshot.financialMaturityLevel),
    districts,
    alerts,
    highlights,
    totalNetWorthCents: snapshot.totalNetWorthCents,
    unlockedDistrictCount: districts.filter((district) => district.unlocked).length,
    hasYieldToCollect: snapshot.hasYieldToCollect,
    mentorMessage:
      alerts[0] ??
      "Diversificar ajuda a Cidade Fortuna a crescer de forma mais equilibrada.",
  };
}
