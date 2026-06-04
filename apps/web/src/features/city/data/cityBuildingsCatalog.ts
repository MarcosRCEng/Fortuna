import type {
  CityBuildingStageRule,
  CityBuildingType,
  CityBuildingUnlockRule,
} from "../city.types.js";

export type CityBuildingCatalogItem = {
  id: CityBuildingType;
  title: string;
  shortLabel: string;
  district: string;
  purpose: string;
  route?: string;
  assetPrefix: string;
  position: { tileX: number; tileY: number };
  unlockRule: CityBuildingUnlockRule;
  stageRule: CityBuildingStageRule;
  visualPriority: number;
};

export const cityBuildingsCatalog: CityBuildingCatalogItem[] = [
  {
    id: "financial_hall",
    title: "Prefeitura Financeira",
    shortLabel: "Prefeitura",
    district: "Centro Civico",
    purpose: "Maturidade geral da cidade.",
    route: "/",
    assetPrefix: "building_financial_hall",
    position: { tileX: 4.1, tileY: 2.78 },
    unlockRule: "always",
    stageRule: "general_maturity",
    visualPriority: 10,
  },
  {
    id: "reserve_bank",
    title: "Banco da Reserva",
    shortLabel: "Reserva",
    district: "Distrito Seguro",
    purpose: "Reserva de emergencia, liquidez e seguranca.",
    route: "/wallet",
    assetPrefix: "building_reserve_bank",
    position: { tileX: 2.15, tileY: 3.35 },
    unlockRule: "has_cash",
    stageRule: "reserve_security",
    visualPriority: 20,
  },
  {
    id: "city_exchange",
    title: "Bolsa da Cidade",
    shortLabel: "Bolsa",
    district: "Mercado Educativo",
    purpose: "Acoes, oscilacao, risco e aprendizado de mercado.",
    route: "/market",
    assetPrefix: "building_city_exchange",
    position: { tileX: 5.25, tileY: 1.12 },
    unlockRule: "has_variable_income",
    stageRule: "variable_income",
    visualPriority: 30,
  },
  {
    id: "real_estate_center",
    title: "Centro Imobiliario",
    shortLabel: "Imoveis",
    district: "Quadra Imobiliaria",
    purpose: "FIIs, imoveis simulados e renda recorrente.",
    route: "/market",
    assetPrefix: "building_real_estate_center",
    position: { tileX: 6.55, tileY: 4.02 },
    unlockRule: "has_real_estate",
    stageRule: "real_estate_income",
    visualPriority: 40,
  },
  {
    id: "financial_school",
    title: "Escola Financeira",
    shortLabel: "Escola",
    district: "Campus Educativo",
    purpose: "Trilhas educativas, leitura de conceitos e missoes.",
    route: "/missions",
    assetPrefix: "building_financial_school",
    position: { tileX: 2.05, tileY: 5.38 },
    unlockRule: "has_completed_mission",
    stageRule: "education_progress",
    visualPriority: 50,
  },
  {
    id: "income_park",
    title: "Parque dos Rendimentos",
    shortLabel: "Rendimentos",
    district: "Praca dos Fluxos",
    purpose: "Renda passiva simulada, proventos e acompanhamento.",
    route: "/missions",
    assetPrefix: "building_income_park",
    position: { tileX: 4.9, tileY: 5.04 },
    unlockRule: "has_income",
    stageRule: "passive_income",
    visualPriority: 60,
  },
  {
    id: "mentor_tower",
    title: "Torre do Mentor",
    shortLabel: "Mentor",
    district: "Orientacao",
    purpose: "Alertas, dicas e orientacao educativa contextual.",
    route: "/",
    assetPrefix: "building_mentor_tower",
    position: { tileX: 7.45, tileY: 2.2 },
    unlockRule: "always",
    stageRule: "mentor_guidance",
    visualPriority: 70,
  },
];
