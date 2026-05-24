import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class MoneyResponseDto {
  @ApiProperty({ example: 123456 })
  amountCents!: number;

  @ApiProperty({ example: "FORTUNA" })
  currency!: string;

  @ApiProperty({ example: "F$ 1.234,56" })
  formatted!: string;
}

export class ApiErrorDto {
  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiProperty({ example: "INSUFFICIENT_FUNDS" })
  error!: string;

  @ApiProperty({ example: "INSUFFICIENT_FUNDS" })
  code!: string;

  @ApiProperty({
    example: "Insufficient balance to complete the operation.",
  })
  message!: string;

  @ApiProperty({
    required: false,
    example: { requiredAmountCents: 100000, availableAmountCents: 50000 },
  })
  details?: Record<string, unknown>;

  @ApiProperty({ example: "2026-05-23T00:00:00.000Z" })
  timestamp!: string;

  @ApiProperty({ example: "/api/v1/players/player-1/buy" })
  path!: string;
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

  @ApiProperty({ type: MoneyResponseDto })
  wallet!: MoneyResponseDto;

  @ApiProperty({ example: "2026-05-21T12:00:00.000Z" })
  createdAt!: string;
}

export class TradeAssetRequestDto {
  @ApiProperty({
    example: "asset-fiisf001",
    description: "ID do ativo. Simbolos legados tambem sao aceitos no MVP.",
  })
  assetId!: string;

  @ApiPropertyOptional({ example: "FIISF001" })
  symbol?: string;

  @ApiProperty({
    example: "5",
    description: "Quantidade inteira positiva serializada como string.",
  })
  quantity!: string;
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

  @ApiPropertyOptional({
    example: 1234,
    description: "Preco unitario em centavos inteiros.",
  })
  unitPriceCents?: number;

  @ApiProperty({ example: 6170, description: "Total em centavos inteiros." })
  totalCents!: number;

  @ApiProperty({
    example: 13830,
    description: "Saldo apos a operacao em centavos inteiros.",
  })
  balanceAfterCents!: number;

  @ApiProperty({ example: "2026-05-21T12:00:00.000Z" })
  occurredAt!: string;
}

export class WalletSummaryResponseDto {
  @ApiProperty({
    example: 13830,
    description: "Saldo disponivel em centavos inteiros.",
  })
  availableBalanceCents!: number;

  @ApiProperty({
    example: 6170,
    description: "Valor investido em centavos inteiros.",
  })
  investedValueCents!: number;

  @ApiProperty({
    example: 20000,
    description: "Patrimonio total em centavos inteiros.",
  })
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

export class WalletResponseDto {
  @ApiProperty({ example: "player-123" })
  playerId!: string;

  @ApiProperty({ example: 20000 })
  balanceCents!: number;

  @ApiProperty({ example: "FORTUNA" })
  currency!: string;

  @ApiProperty({ example: "F$ 200,00" })
  formatted!: string;

  @ApiProperty({ type: MoneyResponseDto })
  balance!: MoneyResponseDto;

  @ApiProperty({ example: "2026-05-23T00:00:00.000Z" })
  updatedAt!: string;
}

export class PortfolioPositionResponseDto {
  @ApiProperty({ example: "asset-fiisf001" })
  assetId!: string;

  @ApiProperty({ example: "FIISF001" })
  symbol!: string;

  @ApiProperty({ example: "FII Shopping Fortuna" })
  name!: string;

  @ApiProperty({ example: "5" })
  quantity!: string;

  @ApiProperty({ example: 10000 })
  averagePriceCents!: number;

  @ApiProperty({ example: 10000 })
  currentPriceCents!: number;

  @ApiProperty({ example: 50000 })
  investedValueCents!: number;

  @ApiProperty({ example: 50000 })
  marketValueCents!: number;

  @ApiProperty({ example: 0 })
  unrealizedResultCents!: number;

  @ApiProperty({ example: "F$ 500,00" })
  formattedMarketValue!: string;
}

export class PortfolioResponseDto {
  @ApiProperty({ example: "player-123" })
  playerId!: string;

  @ApiProperty({ type: PortfolioPositionResponseDto, isArray: true })
  positions!: PortfolioPositionResponseDto[];

  @ApiProperty({ example: 50000 })
  totalInvestedCents!: number;

  @ApiProperty({ example: 50000 })
  totalMarketValueCents!: number;

  @ApiProperty({ example: "F$ 500,00" })
  formattedTotalMarketValue!: string;
}

export class AllocationItemResponseDto {
  @ApiProperty({ example: "FII", required: false })
  assetType?: string;

  @ApiProperty({ example: "asset-fiisf001", required: false })
  assetId?: string;

  @ApiProperty({ example: "FIISF001", required: false })
  symbol?: string;

  @ApiProperty({ example: 50000 })
  valueCents!: number;

  @ApiProperty({ example: 10000 })
  basisPoints!: number;

  @ApiProperty({ example: "100,00%" })
  percentageFormatted!: string;
}

export class PortfolioAllocationResponseDto {
  @ApiProperty({ example: "player-123" })
  playerId!: string;

  @ApiProperty({ type: AllocationItemResponseDto, isArray: true })
  byAssetType!: AllocationItemResponseDto[];

  @ApiProperty({ type: AllocationItemResponseDto, isArray: true })
  byAsset!: AllocationItemResponseDto[];
}

export class PlayerSummaryResponseDto {
  @ApiProperty({ example: "player-123" })
  playerId!: string;

  @ApiProperty({ type: MoneyResponseDto })
  walletBalance!: MoneyResponseDto;

  @ApiProperty({ type: MoneyResponseDto })
  totalInvested!: MoneyResponseDto;

  @ApiProperty({ type: MoneyResponseDto })
  portfolioMarketValue!: MoneyResponseDto;

  @ApiProperty({ type: MoneyResponseDto })
  totalEquity!: MoneyResponseDto;

  @ApiProperty({ type: MoneyResponseDto })
  totalIncomeCollected!: MoneyResponseDto;

  @ApiProperty({ example: 3 })
  totalTransactions!: number;

  @ApiProperty({ type: PortfolioAllocationResponseDto })
  allocation!: PortfolioAllocationResponseDto;
}

export class PlayerGameLoopStateResponseDto {
  @ApiProperty({ example: { id: "player-123", name: "Marcos", level: 2, progressPercent: 40 } })
  player!: {
    id: string;
    name: string;
    level: number;
    progressPercent: number;
  };

  @ApiProperty({ example: { availableBalanceCents: 15000, availableBalanceFormatted: "F$ 150,00" } })
  wallet!: {
    availableBalanceCents: number;
    availableBalanceFormatted: string;
  };

  @ApiProperty({
    example: {
      totalPatrimonyCents: 50000,
      totalPatrimonyFormatted: "F$ 500,00",
      allocation: [{ assetClass: "FII", percentageBasisPoints: 4500 }],
    },
  })
  portfolio!: {
    totalPatrimonyCents: number;
    totalPatrimonyFormatted: string;
    allocation: Array<{
      assetClass: string;
      percentageBasisPoints: number;
    }>;
  };

  @ApiProperty({ example: { collectableCents: 250, collectableFormatted: "F$ 2,50" } })
  income!: {
    collectableCents: number;
    collectableFormatted: string;
  };

  @ApiProperty({ example: { active: [], completedRecently: [] } })
  missions!: {
    active: unknown[];
    completedRecently: unknown[];
  };

  @ApiProperty({ example: { latestMessages: [] } })
  mentor!: {
    latestMessages: unknown[];
  };

  @ApiProperty({
    example: {
      level: 2,
      districts: {
        walletDistrictLevel: 2,
        incomeDistrictLevel: 1,
        diversificationDistrictLevel: 1,
        educationDistrictLevel: 1,
      },
    },
  })
  city!: {
    level: number;
    districts: unknown;
  };

  @ApiProperty({ example: { latest: [] } })
  history!: {
    latest: Array<{
      id: string;
      type: string;
      occurredAt: string;
      title: string;
      description: string;
      amountCents?: number;
      assetId?: string;
      missionId?: string;
      metadata?: Record<string, unknown>;
    }>;
  };
}

export class RunGameLoopTickResponseDto {
  @ApiProperty({ example: "player-123" })
  playerId!: string;

  @ApiProperty({
    example: [
      {
        id: "game-event-1",
        type: "MARKET_PRICES_REFRESHED",
        occurredAt: "2026-05-23T00:00:00.000Z",
      },
    ],
  })
  events!: Array<{
    id: string;
    type: string;
    occurredAt: string;
    metadata?: Record<string, unknown>;
  }>;

  @ApiProperty({ type: PlayerGameLoopStateResponseDto })
  state!: PlayerGameLoopStateResponseDto;
}

export class OrderExecutionResponseDto {
  @ApiProperty({ example: "tx-1" })
  orderId!: string;

  @ApiProperty({ example: "BUY" })
  type!: string;

  @ApiProperty({ example: "player-123" })
  playerId!: string;

  @ApiProperty({ example: "asset-fiisf001" })
  assetId!: string;

  @ApiProperty({ example: "FIISF001" })
  symbol!: string;

  @ApiProperty({ example: "5" })
  quantity!: string;

  @ApiProperty({ example: 10000 })
  unitPriceCents!: number;

  @ApiProperty({ example: 50000 })
  totalCents!: number;

  @ApiProperty({ example: 150000 })
  walletBalanceAfterCents!: number;

  @ApiProperty({ example: "2026-05-23T00:00:00.000Z" })
  createdAt!: string;
}

export class TransactionsListResponseDto {
  @ApiProperty({ example: "player-123" })
  playerId!: string;

  @ApiProperty({ type: TransactionResponseDto, isArray: true })
  items!: TransactionResponseDto[];

  @ApiProperty({ example: 1 })
  total!: number;
}

export class CollectIncomeRequestDto {
  @ApiPropertyOptional({ example: "asset-fiisf001" })
  assetId?: string;

  @ApiPropertyOptional({ example: "income-001" })
  incomeEventId?: string;
}

export class IncomeEventCollectedResponseDto {
  @ApiProperty({ example: "income-001" })
  incomeEventId!: string;

  @ApiProperty({ example: "asset-fiisf001" })
  assetId!: string;

  @ApiProperty({ example: "FIISF001" })
  symbol!: string;

  @ApiProperty({ example: 250 })
  amountCents!: number;
}

export class CollectIncomeResponseDto {
  @ApiProperty({ example: "player-123" })
  playerId!: string;

  @ApiProperty({ example: 250 })
  collectedIncomeCents!: number;

  @ApiProperty({ example: "F$ 2,50" })
  formattedCollectedIncome!: string;

  @ApiProperty({ type: IncomeEventCollectedResponseDto, isArray: true })
  events!: IncomeEventCollectedResponseDto[];

  @ApiProperty({ example: 20250 })
  walletBalanceAfterCents!: number;

  @ApiProperty({ example: "2026-05-23T00:00:00.000Z" })
  createdAt!: string;
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

  @ApiProperty({
    example: 10000,
    description: "Preco atual em centavos inteiros.",
  })
  currentPriceCents!: number;

  @ApiProperty({ type: MoneyResponseDto })
  currentPrice!: MoneyResponseDto;

  @ApiProperty({ example: "F$ 100,00" })
  formattedCurrentPrice!: string;

  @ApiProperty({
    example: 9998,
    required: false,
    description: "Preco anterior em centavos inteiros.",
  })
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

  @ApiProperty({
    example: 1234,
    description: "Cotacao em centavos inteiros.",
  })
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

  @ApiProperty({
    example: 70,
    required: false,
    description: "Rendimento por unidade em centavos inteiros.",
  })
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

export class AssetPriceResponseDto {
  @ApiProperty({ example: "asset-fiisf001" })
  assetId!: string;

  @ApiProperty({ example: "FIISF001" })
  symbol!: string;

  @ApiProperty({ example: 10000 })
  priceCents!: number;

  @ApiProperty({ example: "FORTUNA" })
  currency!: string;

  @ApiProperty({ example: "F$ 100,00" })
  formatted!: string;

  @ApiProperty({ example: "2026-05-23T00:00:00.000Z" })
  updatedAt!: string;
}

export class AssetYieldResponseDto {
  @ApiProperty({ example: "asset-fiisf001" })
  assetId!: string;

  @ApiProperty({ example: "FIISF001" })
  symbol!: string;

  @ApiProperty({ example: true })
  hasYield!: boolean;

  @ApiProperty({ example: "MONTHLY_INCOME", nullable: true })
  yieldType!: string | null;

  @ApiProperty({ example: 70 })
  lastYieldCents!: number;

  @ApiProperty({ example: "F$ 0,70" })
  formattedLastYield!: string;

  @ApiProperty({ example: "2026-06-15", nullable: true })
  nextPaymentDate!: string | null;
}

export class AssetHistoryResponseDto {
  @ApiProperty({ example: "asset-fiisf001" })
  assetId!: string;

  @ApiProperty({ example: "FIISF001" })
  symbol!: string;

  @ApiProperty({
    example: [{ date: "2026-05-23", priceCents: 10000, formatted: "F$ 100,00" }],
  })
  history!: Array<{ date: string; priceCents: number; formatted: string }>;
}

export class AssetHistoryPointResponseDto {
  @ApiProperty({ example: "FIISF001" })
  symbol!: string;

  @ApiProperty({ example: "2026-05-21" })
  date!: string;

  @ApiProperty({
    example: 10000,
    description: "Preco de abertura em centavos inteiros.",
  })
  openPriceCents!: number;

  @ApiProperty({
    example: 10045,
    description: "Preco de fechamento em centavos inteiros.",
  })
  closePriceCents!: number;

  @ApiProperty({
    example: 9980,
    description: "Preco minimo em centavos inteiros.",
  })
  minPriceCents!: number;

  @ApiProperty({
    example: 10080,
    description: "Preco maximo em centavos inteiros.",
  })
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

export class RefreshedAssetResponseDto {
  @ApiProperty({ example: "asset-fiisf001" })
  assetId!: string;

  @ApiProperty({ example: "FIISF001" })
  symbol!: string;

  @ApiProperty({ example: 9980 })
  previousPriceCents!: number;

  @ApiProperty({ example: 10000 })
  currentPriceCents!: number;

  @ApiProperty({ example: 20 })
  variationBasisPoints!: number;

  @ApiProperty({ example: "2026-05-23T00:00:00.000Z" })
  updatedAt!: string;
}

export class RefreshMarketPricesResponseDto {
  @ApiProperty({ type: RefreshedAssetResponseDto, isArray: true })
  updatedAssets!: RefreshedAssetResponseDto[];

  @ApiProperty({ example: "2026-05-23T00:00:00.000Z" })
  updatedAt!: string;
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

export class MentorMessageResponseDto {
  @ApiProperty({ example: "mentor-message-1" })
  id!: string;

  @ApiProperty({ example: "player-123" })
  playerId!: string;

  @ApiProperty({ example: "educational_alert" })
  type!: string;

  @ApiProperty({ example: "concentrated_purchase" })
  trigger!: string;

  @ApiProperty({ example: "Atencao a concentracao" })
  title!: string;

  @ApiProperty({
    example:
      "Uma parte grande da sua carteira esta em um unico ativo. Isso pode aumentar a dependencia do desempenho dele.",
  })
  message!: string;

  @ApiPropertyOptional({ example: "diversificacao" })
  educationalConcept?: string;

  @ApiProperty({ example: "warning" })
  severity!: string;

  @ApiPropertyOptional({ example: "asset" })
  relatedEntityType?: string;

  @ApiPropertyOptional({ example: "asset-fiisf001" })
  relatedEntityId?: string;

  @ApiPropertyOptional({ example: { maxAllocationBasisPoints: 7500 } })
  metadata?: Record<string, string | number | boolean | null>;

  @ApiProperty({ example: "2026-05-24T12:00:00.000Z" })
  createdAt!: string;

  @ApiProperty({ example: null, nullable: true })
  readAt!: string | null;
}

export class MentorMessageListResponseDto {
  @ApiProperty({ type: MentorMessageResponseDto, isArray: true })
  items!: MentorMessageResponseDto[];
}

export class MentorLatestMessageResponseDto {
  @ApiProperty({ type: MentorMessageResponseDto, nullable: true })
  message!: MentorMessageResponseDto | null;
}
