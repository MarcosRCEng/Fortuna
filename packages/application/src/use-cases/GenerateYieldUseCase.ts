import {
  AssetNotFoundError,
  AssetSymbol,
  IncomeEvent,
  MoneyCents,
  PositionNotFoundError,
  type FinancialEvent,
} from "@fortuna/domain";
import type { AssetRepository } from "../ports/AssetRepository.js";
import type { Clock } from "../ports/Clock.js";
import type { DomainEventPublisher } from "../events/DomainEventPublisher.js";
import type { IncomeEventRepository } from "../ports/IncomeEventRepository.js";
import type { LoggerPort } from "../ports/LoggerPort.js";
import type { WalletRepository } from "../ports/WalletRepository.js";
import type { UseCaseResult } from "./UseCaseResult.js";

export interface GenerateYieldCommand {
  playerId: string;
  symbol: string;
  amountCents: number;
  yieldType: string;
  dueCycle?: number | string;
  correlationId?: string;
}

export class GenerateYieldUseCase {
  constructor(
    private readonly assets: AssetRepository,
    private readonly wallets: WalletRepository,
    private readonly incomeEvents: IncomeEventRepository,
    private readonly clock: Clock,
    private readonly idGenerator: () => string,
    private readonly logger?: LoggerPort,
    private readonly events?: DomainEventPublisher,
  ) {}

  async execute(
    command: GenerateYieldCommand,
  ): Promise<UseCaseResult<IncomeEvent>> {
    const symbol = AssetSymbol.create(command.symbol);
    const asset = await this.assets.findBySymbol(symbol);
    if (!asset) {
      throw new AssetNotFoundError(symbol.value);
    }

    const wallet = await this.wallets.findByPlayerId(command.playerId);
    const position = wallet?.getPosition(asset.symbol.value);
    if (!position) {
      throw new PositionNotFoundError(asset.symbol.value);
    }

    const amount = MoneyCents.fromCents(command.amountCents);
    const occurredAt = this.clock.now();
    const incomeEvent = new IncomeEvent(
      this.idGenerator(),
      asset,
      amount,
      occurredAt,
    );

    await this.incomeEvents.save(incomeEvent);

    const events: FinancialEvent[] = [
      {
        type: "YieldGenerated",
        playerId: command.playerId,
        occurredAt,
        incomeEventId: incomeEvent.id,
        asset,
        total: amount,
        yieldType: command.yieldType,
        dueCycle: command.dueCycle,
      },
    ];

    await this.events?.publishFinancialEvents(events, {
      correlationId: command.correlationId,
      causationId: incomeEvent.id,
    });

    this.logger?.info("Yield generated successfully", {
      module: "income",
      action: "yield_generated",
      correlationId: command.correlationId,
      context: {
        playerId: command.playerId,
        assetId: asset.id,
        assetSymbol: asset.symbol.value,
        pendingYieldId: incomeEvent.id,
        amountCents: amount.cents,
      },
    });

    return { data: incomeEvent, events };
  }
}
