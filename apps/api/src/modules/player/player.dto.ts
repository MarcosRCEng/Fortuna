import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ApiErrorDto {
  @ApiProperty({
    example: {
      type: "business_rule_violation",
      code: "INSUFFICIENT_BALANCE",
      message: "Insufficient balance to complete the operation.",
    },
  })
  error!: {
    type: string;
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export class CreatePlayerRequestDto {
  @ApiPropertyOptional({ example: "player-123" })
  id?: string;

  @ApiProperty({ example: "Marcos" })
  name!: string;

  @ApiPropertyOptional({ example: "Investidor Iniciante" })
  nickname?: string;

  @ApiPropertyOptional({
    example: 20000,
    description:
      "Saldo inicial em centavos. 1 moeda Fortuna = R$ 0,01. Padrao: 20000.",
  })
  initialBalanceCents?: number;
}

export class PlayerResponseDto {
  @ApiProperty({ example: "player-123" })
  id!: string;

  @ApiProperty({ example: "Marcos" })
  name!: string;

  @ApiPropertyOptional({ example: "Investidor Iniciante" })
  nickname?: string;

  @ApiProperty({ example: 20000 })
  initialBalanceCents!: number;

  @ApiProperty({ example: "2026-05-21T12:00:00.000Z" })
  createdAt!: string;
}

export class TradeAssetRequestDto {
  @ApiProperty({ example: "FIISF001" })
  symbol!: string;

  @ApiProperty({ example: 5, description: "Quantidade inteira de cotas." })
  quantity!: number;
}

export class TransactionResponseDto {
  @ApiProperty({ example: "tx-1" })
  id!: string;

  @ApiProperty({ example: "BUY" })
  type!: string;

  @ApiPropertyOptional({ example: "FIISF001" })
  symbol?: string;

  @ApiPropertyOptional({ example: 5 })
  quantity?: number;

  @ApiPropertyOptional({ example: 1234 })
  unitPriceCents?: number;

  @ApiProperty({ example: 6170 })
  totalCents!: number;

  @ApiProperty({ example: 13830 })
  balanceAfterCents!: number;

  @ApiProperty({ example: "2026-05-21T12:00:00.000Z" })
  occurredAt!: string;
}

export class WalletSummaryResponseDto {
  @ApiProperty({ example: 13830 })
  availableBalanceCents!: number;

  @ApiProperty({ example: 6170 })
  investedValueCents!: number;

  @ApiProperty({ example: 20000 })
  totalEquityCents!: number;

  @ApiProperty({ example: 1 })
  positionCount!: number;

  @ApiProperty({
    example: [
      {
        symbol: "FIISF001",
        name: "FII Shopping Fortuna",
        quantity: 5,
        averagePriceCents: 10000,
        marketValueCents: 50000,
      },
    ],
  })
  positions!: Array<{
    symbol: string;
    name: string;
    quantity: number;
    averagePriceCents: number;
    marketValueCents: number;
  }>;
}

export class AssetResponseDto {
  @ApiProperty({ example: "asset-tsf001" })
  id!: string;

  @ApiProperty({ example: "TSF001" })
  symbol!: string;

  @ApiProperty({ example: "Tesouro Selic Fortuna" })
  name!: string;

  @ApiProperty({ example: "FIXED_INCOME" })
  assetClass!: string;

  @ApiProperty({ example: 10000 })
  currentPriceCents!: number;

  @ApiProperty({ example: 9998, required: false })
  previousPriceCents?: number;

  @ApiProperty({ example: 2 })
  variationBps!: number;

  @ApiProperty({ example: "LOW" })
  riskLevel!: string;

  @ApiProperty({ example: "DAILY" })
  liquidity!: string;

  @ApiProperty({ example: "SIMULATED" })
  priceStatus!: string;

  @ApiProperty({ example: "MOCK" })
  dataSource!: string;

  @ApiProperty({ example: true })
  isMocked!: boolean;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({
    example: "Renda fixa inspirada em titulo publico de liquidez diaria.",
  })
  educationalDescription!: string;

  @ApiProperty({ example: "2026-05-21T12:00:00.000Z" })
  updatedAt!: string;
}

export class MarketQuoteResponseDto {
  @ApiProperty({ example: "TSF001" })
  symbol!: string;

  @ApiProperty({ example: 1234 })
  priceCents!: number;

  @ApiProperty({ example: "2026-05-21T12:00:00.000Z" })
  asOf!: string;

  @ApiProperty({ example: "MOCK" })
  provider!: string;

  @ApiProperty({ example: "SIMULATED" })
  priceStatus!: string;
}

export class EducationalAssetInfoDto {
  @ApiProperty({ example: "TSF001" })
  symbol!: string;

  @ApiProperty({
    example: "Renda fixa inspirada em titulo publico de liquidez diaria.",
  })
  shortDescription!: string;

  @ApiProperty({
    example:
      "Ativo ficticio de baixo risco para ensinar previsibilidade, liquidez e acumulacao gradual.",
  })
  longDescription!: string;

  @ApiProperty({ example: "Baixo risco, com oscilacao simulada pequena." })
  riskExplanation!: string;

  @ApiProperty({ example: "Liquidez diaria simulada." })
  liquidityExplanation!: string;

  @ApiProperty({ example: "Use renda fixa para objetivos proximos." })
  beginnerTip!: string;

  @ApiProperty({ example: "Crescimento consistente tambem evolui a cidade." })
  mentorHint!: string;
}

export class AssetDetailsResponseDto {
  @ApiProperty({ type: AssetResponseDto })
  asset!: AssetResponseDto;

  @ApiProperty({ type: EducationalAssetInfoDto })
  educationalInfo!: EducationalAssetInfoDto;
}

export class ExpectedYieldResponseDto {
  @ApiProperty({ example: "TSF001" })
  symbol!: string;

  @ApiProperty({ example: "FIXED_RATE" })
  yieldType!: string;

  @ApiProperty({ example: "DAILY" })
  periodicity!: string;

  @ApiProperty({ example: 70, required: false })
  amountPerUnitCents?: number;

  @ApiProperty({ example: 8, required: false })
  rateBps?: number;

  @ApiProperty({
    example:
      "Rendimento diario previsivel, simulado em basis points e calculado em centavos.",
  })
  description!: string;

  @ApiProperty({ example: "2026-06-21T00:00:00.000Z", required: false })
  nextPaymentDate?: string;
}

export class AssetHistoryPointResponseDto {
  @ApiProperty({ example: "FIISF001" })
  symbol!: string;

  @ApiProperty({ example: "2026-05-21" })
  date!: string;

  @ApiProperty({ example: 10000 })
  openPriceCents!: number;

  @ApiProperty({ example: 10045 })
  closePriceCents!: number;

  @ApiProperty({ example: 9980 })
  minPriceCents!: number;

  @ApiProperty({ example: 10080 })
  maxPriceCents!: number;

  @ApiProperty({ example: 15000, required: false })
  volume?: number;
}

export class MarketProviderStatusResponseDto {
  @ApiProperty({ example: "SIMULATED" })
  sessionStatus!: string;

  @ApiProperty({ example: "MOCK" })
  dataSource!: string;

  @ApiProperty({ example: "SIMULATED" })
  priceStatus!: string;

  @ApiProperty({ example: "2026-05-21T12:00:00.000Z" })
  checkedAt!: string;

  @ApiProperty({
    example: "Mock provider deterministico para o MVP.",
    required: false,
  })
  message?: string;
}

export class RefreshMarketPricesRequestDto {
  @ApiProperty({
    example: "2026-05-22T12:00:00.000Z",
    required: false,
    description:
      "Data simulada opcional. Quando omitida, o provider usa o clock configurado.",
  })
  asOf?: string;
}

export class MentorTipResponseDto {
  @ApiProperty({ example: "player-1:mentor-rule-no-reserve" })
  id!: string;

  @ApiProperty({ example: "mentor-rule-no-reserve" })
  ruleId!: string;

  @ApiProperty({ example: "EDUCATIONAL_ALERT" })
  type!: string;

  @ApiProperty({ example: "Reserva ainda em formacao" })
  title!: string;

  @ApiProperty({
    example:
      "Sua reserva simulada ainda esta baixa. Em educacao financeira, reserva de emergencia e dinheiro com liquidez para reduzir a necessidade de vender ativos em momentos ruins.",
  })
  message!: string;

  @ApiProperty({ example: "EMERGENCY_RESERVE" })
  concept!: string;

  @ApiProperty({ example: "WARNING" })
  severity!: string;

  @ApiProperty({ example: "2026-05-22T12:00:00.000Z" })
  createdAt!: string;

  @ApiPropertyOptional({ example: "Ver missao de reserva" })
  actionLabel?: string;

  @ApiPropertyOptional({ example: "mission-emergency-reserve" })
  relatedMissionId?: string;

  @ApiPropertyOptional({ example: "asset-fiisf001" })
  relatedAssetId?: string;

  @ApiProperty({
    example: { liquidReserveCents: 1000, targetCents: 20000 },
  })
  metadata!: Record<string, string | number | boolean>;
}
