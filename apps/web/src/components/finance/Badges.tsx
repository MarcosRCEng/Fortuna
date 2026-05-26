import type {
  AssetClass,
  LiquidityLevel,
  RiskLevel,
} from "../../services/types.js";

const assetClassLabels: Record<AssetClass, string> = {
  CASH: "Caixa",
  FIXED_INCOME: "Renda fixa",
  FII: "FII",
  STOCK: "Acao",
};

const riskLabels: Record<RiskLevel, string> = {
  NONE: "Sem risco de mercado",
  LOW: "Risco baixo",
  MEDIUM: "Risco medio",
  MEDIUM_HIGH: "Risco medio/alto",
  HIGH: "Risco alto",
};

const liquidityLabels: Record<LiquidityLevel, string> = {
  IMMEDIATE: "Liquidez imediata",
  DAILY: "Liquidez diaria",
  MEDIUM: "Liquidez media",
  HIGH: "Liquidez alta",
  LOW: "Liquidez baixa",
};

export function AssetClassBadge({ value }: { value: AssetClass }) {
  return <span className={`badge class-${value.toLowerCase()}`}>{assetClassLabels[value]}</span>;
}

export function RiskBadge({ value }: { value: RiskLevel }) {
  return <span className={`badge risk-${value.toLowerCase()}`}>{riskLabels[value]}</span>;
}

export function LiquidityBadge({ value }: { value: LiquidityLevel }) {
  return <span className="badge badge-neutral">{liquidityLabels[value]}</span>;
}

export function MockDataBadge() {
  return <span className="badge badge-mock">Dados simulados MVP</span>;
}

export function MarketStatusBadge({ updating }: { updating: boolean }) {
  return (
    <span className={`badge ${updating ? "badge-warning" : "badge-neutral"}`}>
      {updating ? "Mercado atualizando" : "Mercado simulado estavel"}
    </span>
  );
}
