CREATE TABLE "player_watchlists" (
  "id" VARCHAR(100) NOT NULL,
  "player_id" VARCHAR(80) NOT NULL,
  "visible_groups" TEXT[],
  "portfolio_only" BOOLEAN NOT NULL DEFAULT false,
  "sort_by" VARCHAR(40) NOT NULL DEFAULT 'position',
  "sort_order" VARCHAR(10) NOT NULL DEFAULT 'asc',
  "max_items_per_group" INTEGER,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "player_watchlists_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "player_watchlists_player_id_key" UNIQUE ("player_id")
);

CREATE TABLE "player_watchlist_items" (
  "id" VARCHAR(100) NOT NULL,
  "watchlist_id" VARCHAR(100) NOT NULL,
  "symbol" VARCHAR(20) NOT NULL,
  "asset_type" VARCHAR(40) NOT NULL,
  "position" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "player_watchlist_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "player_watchlist_items_watchlist_id_symbol_key" UNIQUE ("watchlist_id", "symbol")
);

CREATE INDEX "player_watchlist_items_watchlist_id_position_idx"
  ON "player_watchlist_items"("watchlist_id", "position");

ALTER TABLE "player_watchlists"
  ADD CONSTRAINT "player_watchlists_player_id_fkey"
  FOREIGN KEY ("player_id") REFERENCES "players"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "player_watchlist_items"
  ADD CONSTRAINT "player_watchlist_items_watchlist_id_fkey"
  FOREIGN KEY ("watchlist_id") REFERENCES "player_watchlists"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

COMMENT ON TABLE "player_watchlists" IS
  'Rollback logico: remover registros destas tabelas por player_id ou descartar as tabelas se a sprint for revertida; nenhum dado de carteira ou catalogo e duplicado aqui.';
