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
  @ApiProperty({ example: "FORT3" })
  symbol!: string;

  @ApiProperty({ example: 5, description: "Quantidade inteira de cotas." })
  quantity!: number;
}

export class TransactionResponseDto {
  @ApiProperty({ example: "tx-1" })
  id!: string;

  @ApiProperty({ example: "BUY" })
  type!: string;

  @ApiPropertyOptional({ example: "FORT3" })
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
        symbol: "FORT3",
        name: "Fortuna Educacao ON",
        quantity: 5,
        averagePriceCents: 1234,
        marketValueCents: 6170,
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
  @ApiProperty({ example: "asset-fort3" })
  id!: string;

  @ApiProperty({ example: "FORT3" })
  symbol!: string;

  @ApiProperty({ example: "Fortuna Educacao ON" })
  name!: string;

  @ApiProperty({ example: "STOCK" })
  type!: string;

  @ApiProperty({ example: "HIGH" })
  riskLevel!: string;

  @ApiProperty({ example: true })
  isActive!: boolean;
}

export class MarketQuoteResponseDto {
  @ApiProperty({ example: "FORT3" })
  symbol!: string;

  @ApiProperty({ example: 1234 })
  priceCents!: number;

  @ApiProperty({ example: "2026-05-21T12:00:00.000Z" })
  asOf!: string;

  @ApiProperty({ example: "mock" })
  provider!: string;
}
