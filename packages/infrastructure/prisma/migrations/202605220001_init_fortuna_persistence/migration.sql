CREATE TYPE "PlayerStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');
CREATE TYPE "AssetType" AS ENUM ('STOCK', 'FII', 'FIXED_INCOME', 'TREASURY', 'CASH', 'ETF', 'CRYPTO', 'OTHER');
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH');
CREATE TYPE "LiquidityType" AS ENUM ('DAILY', 'D_PLUS_1', 'D_PLUS_30', 'MATURITY');
CREATE TYPE "TransactionType" AS ENUM ('BUY', 'SELL', 'INCOME_COLLECTED', 'INITIAL_DEPOSIT', 'ADJUSTMENT');
CREATE TYPE "IncomeType" AS ENUM ('DIVIDEND', 'INTEREST', 'RENT', 'YIELD');
CREATE TYPE "IncomeStatus" AS ENUM ('AVAILABLE', 'COLLECTED', 'CANCELLED');
CREATE TYPE "MissionStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'REWARD_CLAIMED');

CREATE TABLE "players" (
  "id" VARCHAR(80) NOT NULL,
  "name" VARCHAR(80) NOT NULL,
  "nickname" VARCHAR(80),
  "status" "PlayerStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "players_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "players_name_not_blank" CHECK (length(btrim("name")) > 0)
);

CREATE TABLE "wallets" (
  "id" VARCHAR(100) NOT NULL,
  "player_id" VARCHAR(80) NOT NULL,
  "available_balance_cents" BIGINT NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "wallets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "wallets_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "wallets_available_balance_non_negative" CHECK ("available_balance_cents" >= 0)
);

CREATE UNIQUE INDEX "wallets_player_id_key" ON "wallets"("player_id");

CREATE TABLE "assets" (
  "id" VARCHAR(80) NOT NULL,
  "symbol" VARCHAR(20) NOT NULL,
  "name" VARCHAR(140) NOT NULL,
  "asset_type" "AssetType" NOT NULL,
  "description" TEXT,
  "risk_level" "RiskLevel" NOT NULL,
  "liquidity_type" "LiquidityType" NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "educational_text" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "assets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "assets_symbol_uppercase" CHECK ("symbol" = upper("symbol")),
  CONSTRAINT "assets_symbol_not_blank" CHECK (length(btrim("symbol")) > 0)
);

CREATE UNIQUE INDEX "assets_symbol_key" ON "assets"("symbol");
CREATE INDEX "assets_asset_type_idx" ON "assets"("asset_type");
CREATE INDEX "assets_is_active_idx" ON "assets"("is_active");

CREATE TABLE "positions" (
  "id" VARCHAR(100) NOT NULL,
  "player_id" VARCHAR(80) NOT NULL,
  "wallet_id" VARCHAR(100) NOT NULL,
  "asset_id" VARCHAR(80) NOT NULL,
  "quantity" INTEGER NOT NULL,
  "average_price_cents" BIGINT NOT NULL,
  "total_invested_cents" BIGINT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "positions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "positions_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "positions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "positions_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "positions_quantity_non_negative" CHECK ("quantity" >= 0),
  CONSTRAINT "positions_average_price_non_negative" CHECK ("average_price_cents" >= 0),
  CONSTRAINT "positions_total_invested_non_negative" CHECK ("total_invested_cents" >= 0)
);

CREATE UNIQUE INDEX "positions_player_id_asset_id_key" ON "positions"("player_id", "asset_id");
CREATE INDEX "positions_wallet_id_idx" ON "positions"("wallet_id");
CREATE INDEX "positions_asset_id_idx" ON "positions"("asset_id");

CREATE TABLE "transactions" (
  "id" VARCHAR(100) NOT NULL,
  "player_id" VARCHAR(80) NOT NULL,
  "wallet_id" VARCHAR(100) NOT NULL,
  "asset_id" VARCHAR(80),
  "transaction_type" "TransactionType" NOT NULL,
  "quantity" INTEGER,
  "unit_price_cents" BIGINT,
  "gross_amount_cents" BIGINT NOT NULL,
  "fees_cents" BIGINT NOT NULL DEFAULT 0,
  "net_amount_cents" BIGINT NOT NULL,
  "balance_before_cents" BIGINT NOT NULL,
  "balance_after_cents" BIGINT NOT NULL,
  "position_before_quantity" INTEGER,
  "position_after_quantity" INTEGER,
  "occurred_at" TIMESTAMPTZ(6) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB,
  CONSTRAINT "transactions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "transactions_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "transactions_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "transactions_quantity_non_negative" CHECK ("quantity" IS NULL OR "quantity" >= 0),
  CONSTRAINT "transactions_unit_price_non_negative" CHECK ("unit_price_cents" IS NULL OR "unit_price_cents" >= 0),
  CONSTRAINT "transactions_amounts_non_negative" CHECK ("gross_amount_cents" >= 0 AND "fees_cents" >= 0 AND "net_amount_cents" >= 0),
  CONSTRAINT "transactions_balances_non_negative" CHECK ("balance_before_cents" >= 0 AND "balance_after_cents" >= 0),
  CONSTRAINT "transactions_positions_non_negative" CHECK (("position_before_quantity" IS NULL OR "position_before_quantity" >= 0) AND ("position_after_quantity" IS NULL OR "position_after_quantity" >= 0)),
  CONSTRAINT "transactions_asset_required_for_asset_ops" CHECK (("transaction_type" NOT IN ('BUY', 'SELL', 'INCOME_COLLECTED')) OR "asset_id" IS NOT NULL),
  CONSTRAINT "transactions_quantity_required_for_trades" CHECK (("transaction_type" NOT IN ('BUY', 'SELL')) OR ("quantity" IS NOT NULL AND "unit_price_cents" IS NOT NULL))
);

CREATE INDEX "transactions_player_id_occurred_at_idx" ON "transactions"("player_id", "occurred_at");
CREATE INDEX "transactions_asset_id_occurred_at_idx" ON "transactions"("asset_id", "occurred_at");
CREATE INDEX "transactions_transaction_type_idx" ON "transactions"("transaction_type");

CREATE TABLE "income_events" (
  "id" VARCHAR(100) NOT NULL,
  "player_id" VARCHAR(80) NOT NULL,
  "asset_id" VARCHAR(80) NOT NULL,
  "position_id" VARCHAR(100),
  "income_type" "IncomeType" NOT NULL,
  "amount_cents" BIGINT NOT NULL,
  "due_date" DATE NOT NULL,
  "collected_at" TIMESTAMPTZ(6),
  "status" "IncomeStatus" NOT NULL DEFAULT 'AVAILABLE',
  "transaction_id" VARCHAR(100),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "income_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "income_events_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "income_events_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "income_events_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "income_events_amount_positive" CHECK ("amount_cents" > 0),
  CONSTRAINT "income_events_collected_consistency" CHECK (("status" = 'COLLECTED' AND "collected_at" IS NOT NULL AND "transaction_id" IS NOT NULL) OR ("status" <> 'COLLECTED' AND "transaction_id" IS NULL))
);

CREATE UNIQUE INDEX "income_events_transaction_id_key" ON "income_events"("transaction_id");
CREATE INDEX "income_events_player_id_status_due_date_idx" ON "income_events"("player_id", "status", "due_date");
CREATE INDEX "income_events_asset_id_due_date_idx" ON "income_events"("asset_id", "due_date");

CREATE TABLE "market_prices" (
  "id" VARCHAR(100) NOT NULL,
  "asset_id" VARCHAR(80) NOT NULL,
  "price_cents" BIGINT NOT NULL,
  "reference_datetime" TIMESTAMPTZ(6) NOT NULL,
  "source" VARCHAR(80) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "market_prices_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "market_prices_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "market_prices_price_positive" CHECK ("price_cents" > 0)
);

CREATE UNIQUE INDEX "market_prices_asset_id_reference_datetime_source_key" ON "market_prices"("asset_id", "reference_datetime", "source");
CREATE INDEX "market_prices_asset_id_reference_datetime_idx" ON "market_prices"("asset_id", "reference_datetime");

CREATE TABLE "missions" (
  "id" VARCHAR(100) NOT NULL,
  "code" VARCHAR(80) NOT NULL,
  "title" VARCHAR(140) NOT NULL,
  "description" TEXT NOT NULL,
  "objective" TEXT NOT NULL,
  "completion_criteria" JSONB NOT NULL,
  "reward_type" VARCHAR(40) NOT NULL,
  "reward_amount_cents" BIGINT NOT NULL DEFAULT 0,
  "educational_explanation" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "missions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "missions_reward_non_negative" CHECK ("reward_amount_cents" >= 0)
);

CREATE UNIQUE INDEX "missions_code_key" ON "missions"("code");
CREATE INDEX "missions_is_active_idx" ON "missions"("is_active");

CREATE TABLE "player_missions" (
  "id" VARCHAR(100) NOT NULL,
  "player_id" VARCHAR(80) NOT NULL,
  "mission_id" VARCHAR(100) NOT NULL,
  "status" "MissionStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "progress_current" INTEGER NOT NULL DEFAULT 0,
  "progress_target" INTEGER NOT NULL DEFAULT 1,
  "started_at" TIMESTAMPTZ(6),
  "completed_at" TIMESTAMPTZ(6),
  "reward_claimed_at" TIMESTAMPTZ(6),
  CONSTRAINT "player_missions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "player_missions_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "player_missions_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "missions"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "player_missions_progress_non_negative" CHECK ("progress_current" >= 0 AND "progress_target" > 0)
);

CREATE UNIQUE INDEX "player_missions_player_id_mission_id_key" ON "player_missions"("player_id", "mission_id");
CREATE INDEX "player_missions_player_id_status_idx" ON "player_missions"("player_id", "status");

CREATE TABLE "city_state" (
  "id" VARCHAR(100) NOT NULL,
  "player_id" VARCHAR(80) NOT NULL,
  "level" INTEGER NOT NULL DEFAULT 1,
  "experience_points" INTEGER NOT NULL DEFAULT 0,
  "unlocked_buildings" JSONB NOT NULL,
  "city_score" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "city_state_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "city_state_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "city_state_numbers_non_negative" CHECK ("level" >= 1 AND "experience_points" >= 0 AND "city_score" >= 0)
);

CREATE UNIQUE INDEX "city_state_player_id_key" ON "city_state"("player_id");

CREATE TABLE "mentor_tips_history" (
  "id" VARCHAR(100) NOT NULL,
  "player_id" VARCHAR(80) NOT NULL,
  "tip_code" VARCHAR(100) NOT NULL,
  "tip_category" VARCHAR(80) NOT NULL,
  "related_event_id" VARCHAR(100),
  "related_asset_id" VARCHAR(80),
  "message" TEXT NOT NULL,
  "shown_at" TIMESTAMPTZ(6) NOT NULL,
  "acknowledged_at" TIMESTAMPTZ(6),
  CONSTRAINT "mentor_tips_history_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "mentor_tips_history_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "mentor_tips_history_related_asset_id_fkey" FOREIGN KEY ("related_asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "mentor_tips_history_player_id_tip_code_shown_at_idx" ON "mentor_tips_history"("player_id", "tip_code", "shown_at");
CREATE INDEX "mentor_tips_history_related_event_id_idx" ON "mentor_tips_history"("related_event_id");

CREATE TABLE "game_events" (
  "id" VARCHAR(100) NOT NULL,
  "player_id" VARCHAR(80) NOT NULL,
  "event_type" VARCHAR(100) NOT NULL,
  "event_payload" JSONB NOT NULL,
  "occurred_at" TIMESTAMPTZ(6) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "game_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "game_events_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "game_events_player_id_occurred_at_idx" ON "game_events"("player_id", "occurred_at");
CREATE INDEX "game_events_event_type_idx" ON "game_events"("event_type");
