import {
  AssetNotFoundError,
  AssetSymbol,
  InsufficientBalanceError,
  InvalidMarketPriceError,
  MoneyCents,
  Quantity,
  WalletNotFoundError,
  type AssetType,
} from "@fortuna/domain";
import type { AssetRepository } from "../ports/AssetRepository.js";
import type { MarketPriceProvider } from "../ports/MarketPriceProvider.js";
import type { WalletRepository } from "../ports/WalletRepository.js";

export type ConcentrationAlertSeverity = "INFO" | "ATTENTION" | "HIGH";

export interface ConcentrationAlert {
  code: string;
  severity: ConcentrationAlertSeverity;
  message: string;
  basisPoints: number;
}

export interface SimulateBuyAssetCommand {
  playerId: string;
  symbol: string;
  quantity: number;
}

export interface SimulatedBuyPosition {
  symbol: string;
  assetType: AssetType;
  currentQuantity: number;
  projectedQuantity: number;
  currentAveragePriceCents: number | null;
  projectedAveragePriceCents: number;
  currentMarketValueCents: number;
  projectedMarketValueCents: number;
}

export interface SimulatedBuyConcentration {
  currentAssetBasisPoints: number;
  projectedAssetBasisPoints: number;
  currentAssetTypeBasisPoints: number;
  projectedAssetTypeBasisPoints: number;
}

export interface SimulatedBuyOrder {
  playerId: string;
  assetId: string;
  symbol: string;
  assetType: AssetType;
  quantity: number;
  unitPriceCents: number;
  totalCostCents: number;
  currentBalanceCents: number;
  projectedBalanceCents: number;
  currentInvestedValueCents: number;
  projectedInvestedValueCents: number;
  currentTotalEquityCents: number;
  projectedTotalEquityCents: number;
  projectedPosition: SimulatedBuyPosition;
  concentration: SimulatedBuyConcentration;
  alerts: ConcentrationAlert[];
  canProceed: true;
}

export class SimulateBuyAssetUseCase {
  constructor(
    private readonly assets: AssetRepository,
    private readonly wallets: WalletRepository,
    private readonly prices: MarketPriceProvider,
  ) {}

  async execute(command: SimulateBuyAssetCommand): Promise<SimulatedBuyOrder> {
    const symbol = AssetSymbol.create(command.symbol);
    const quantity = Quantity.fromUnits(command.quantity);
    const asset = await this.assets.findBySymbol(symbol);
    if (!asset) {
      throw new AssetNotFoundError(symbol.value);
    }

    const wallet = await this.wallets.findByPlayerId(command.playerId);
    if (!wallet) {
      throw new WalletNotFoundError(command.playerId);
    }

    const price = await this.prices.getCurrentPrice(asset);
    if (!price.unitPrice.isGreaterThanOrEqual(MoneyCents.fromCents(1))) {
      throw new InvalidMarketPriceError();
    }

    const total = price.unitPrice.multiplyByQuantity(quantity);
    const currentBalance = wallet.account.availableBalance;
    if (!currentBalance.isGreaterThanOrEqual(total)) {
      throw new InsufficientBalanceError([
        {
          type: "BuyRejectedInsufficientBalance",
          playerId: command.playerId,
          occurredAt: new Date(),
          asset,
          quantity,
          required: total,
          available: currentBalance,
        },
      ]);
    }

    const marketPrices = await this.prices.getCurrentPrices(
      wallet.positions.map((position) => position.asset),
    );
    const currentPosition = wallet.getPosition(asset.symbol.value);
    const currentAssetValue = currentPosition
      ? currentPosition.marketValue(price.unitPrice)
      : MoneyCents.zero();
    const projectedAssetValue = currentAssetValue.add(total);
    const currentInvestedValue = wallet.investedValue(marketPrices);
    const projectedInvestedValue = currentInvestedValue.add(total);
    const projectedBalance = currentBalance.subtract(total);
    const currentTotalEquity = currentBalance.add(currentInvestedValue);
    const projectedTotalEquity = projectedBalance.add(projectedInvestedValue);

    const currentAssetTypeValue = wallet.positions.reduce((sum, position) => {
      if (position.asset.type !== asset.type) {
        return sum;
      }
      const positionPrice = position.asset.symbol.equals(asset.symbol)
        ? price
        : marketPrices.find((item) =>
            item.asset.symbol.equals(position.asset.symbol),
          );
      return positionPrice
        ? sum.add(position.marketValue(positionPrice.unitPrice))
        : sum;
    }, MoneyCents.zero());
    const projectedAssetTypeValue = currentAssetTypeValue.add(total);

    const currentQuantity = currentPosition?.totalQuantity.units ?? 0;
    const projectedQuantity = currentQuantity + quantity.units;
    const currentAveragePrice = currentPosition?.averagePriceCents ?? null;
    const projectedAveragePrice = this.weightedAveragePrice({
      currentQuantity,
      currentAveragePrice,
      quantity,
      unitPrice: price.unitPrice,
    });

    const concentration = {
      currentAssetBasisPoints: this.basisPoints(
        currentAssetValue,
        currentTotalEquity,
      ),
      projectedAssetBasisPoints: this.basisPoints(
        projectedAssetValue,
        projectedTotalEquity,
      ),
      currentAssetTypeBasisPoints: this.basisPoints(
        currentAssetTypeValue,
        currentTotalEquity,
      ),
      projectedAssetTypeBasisPoints: this.basisPoints(
        projectedAssetTypeValue,
        projectedTotalEquity,
      ),
    };

    return {
      playerId: command.playerId,
      assetId: asset.id,
      symbol: asset.symbol.value,
      assetType: asset.type,
      quantity: quantity.units,
      unitPriceCents: price.unitPrice.cents,
      totalCostCents: total.cents,
      currentBalanceCents: currentBalance.cents,
      projectedBalanceCents: projectedBalance.cents,
      currentInvestedValueCents: currentInvestedValue.cents,
      projectedInvestedValueCents: projectedInvestedValue.cents,
      currentTotalEquityCents: currentTotalEquity.cents,
      projectedTotalEquityCents: projectedTotalEquity.cents,
      projectedPosition: {
        symbol: asset.symbol.value,
        assetType: asset.type,
        currentQuantity,
        projectedQuantity,
        currentAveragePriceCents: currentAveragePrice?.cents ?? null,
        projectedAveragePriceCents: projectedAveragePrice.cents,
        currentMarketValueCents: currentAssetValue.cents,
        projectedMarketValueCents: projectedAssetValue.cents,
      },
      concentration,
      alerts: this.concentrationAlerts(concentration),
      canProceed: true,
    };
  }

  private weightedAveragePrice({
    currentQuantity,
    currentAveragePrice,
    quantity,
    unitPrice,
  }: {
    currentQuantity: number;
    currentAveragePrice: MoneyCents | null;
    quantity: Quantity;
    unitPrice: MoneyCents;
  }): MoneyCents {
    if (!currentAveragePrice || currentQuantity === 0) {
      return unitPrice;
    }

    const projectedQuantity = currentQuantity + quantity.units;
    const previousCost = currentAveragePrice.cents * currentQuantity;
    const newCost = unitPrice.cents * quantity.units;
    return MoneyCents.fromCents(
      Math.floor((previousCost + newCost + projectedQuantity / 2) / projectedQuantity),
    );
  }

  private basisPoints(value: MoneyCents, total: MoneyCents): number {
    return total.cents === 0
      ? 0
      : Math.floor((value.cents * 10_000) / total.cents);
  }

  private concentrationAlerts(
    concentration: SimulatedBuyConcentration,
  ): ConcentrationAlert[] {
    const alerts: ConcentrationAlert[] = [];
    if (concentration.projectedAssetBasisPoints >= 5_000) {
      alerts.push({
        code: "ASSET_CONCENTRATION_HIGH",
        severity: "HIGH",
        basisPoints: concentration.projectedAssetBasisPoints,
        message:
          "Apos a compra simulada, este ativo representaria metade ou mais do patrimonio simulado.",
      });
    } else if (concentration.projectedAssetBasisPoints >= 3_500) {
      alerts.push({
        code: "ASSET_CONCENTRATION_ATTENTION",
        severity: "ATTENTION",
        basisPoints: concentration.projectedAssetBasisPoints,
        message:
          "A compra simulada deixaria uma participacao relevante neste ativo.",
      });
    }

    if (concentration.projectedAssetTypeBasisPoints >= 7_000) {
      alerts.push({
        code: "ASSET_TYPE_CONCENTRATION_HIGH",
        severity: "HIGH",
        basisPoints: concentration.projectedAssetTypeBasisPoints,
        message:
          "Apos a compra simulada, esta classe concentraria grande parte do patrimonio simulado.",
      });
    } else if (concentration.projectedAssetTypeBasisPoints >= 5_000) {
      alerts.push({
        code: "ASSET_TYPE_CONCENTRATION_ATTENTION",
        severity: "ATTENTION",
        basisPoints: concentration.projectedAssetTypeBasisPoints,
        message:
          "A compra simulada aumentaria a concentracao nesta classe de ativo.",
      });
    }

    return alerts;
  }
}
