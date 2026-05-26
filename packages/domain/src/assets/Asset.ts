import { AssetSymbol } from "../value-objects/AssetSymbol.js";
import { AssetType } from "../value-objects/AssetType.js";
import { RiskLevel } from "../value-objects/RiskLevel.js";

export type AssetId = string;

export class Asset {
  constructor(
    public readonly id: AssetId,
    public readonly symbol: AssetSymbol,
    public readonly name: string,
    public readonly type: AssetType,
    public readonly riskLevel: RiskLevel,
    public readonly isActive = true,
    public readonly liquidity?: string,
  ) {}
}
