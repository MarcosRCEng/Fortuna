ALTER TABLE "mentor_messages"
  ADD COLUMN IF NOT EXISTS "trigger" VARCHAR(80) NOT NULL DEFAULT 'portfolio_without_diversification',
  ADD COLUMN IF NOT EXISTS "educational_concept" VARCHAR(80),
  ADD COLUMN IF NOT EXISTS "severity" VARCHAR(40) NOT NULL DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS "related_entity_type" VARCHAR(60),
  ADD COLUMN IF NOT EXISTS "related_entity_id" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "metadata" JSONB;

ALTER TABLE "mentor_messages"
  ALTER COLUMN "type" TYPE VARCHAR(40) USING lower("type"::text),
  ALTER COLUMN "trigger" DROP DEFAULT,
  ALTER COLUMN "severity" DROP DEFAULT;

DROP TYPE IF EXISTS "MentorMessageType";

DROP INDEX IF EXISTS "mentor_messages_player_id_idx";
CREATE INDEX IF NOT EXISTS "mentor_messages_player_id_created_at_idx"
  ON "mentor_messages"("player_id", "created_at");
CREATE INDEX IF NOT EXISTS "mentor_messages_player_id_trigger_idx"
  ON "mentor_messages"("player_id", "trigger");
