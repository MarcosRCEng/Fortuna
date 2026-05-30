CREATE TYPE "AuthProvider" AS ENUM ('GOOGLE');
CREATE TYPE "UserRole" AS ENUM ('PLAYER', 'ADMIN');

CREATE TABLE "users" (
  "id" VARCHAR(80) NOT NULL,
  "email" VARCHAR(160) NOT NULL,
  "name" VARCHAR(120),
  "avatar_url" TEXT,
  "google_subject" VARCHAR(160) NOT NULL,
  "provider" "AuthProvider" NOT NULL DEFAULT 'GOOGLE',
  "role" "UserRole" NOT NULL DEFAULT 'PLAYER',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "last_login_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_sessions" (
  "id" VARCHAR(100) NOT NULL,
  "user_id" VARCHAR(80) NOT NULL,
  "refresh_hash" VARCHAR(128) NOT NULL,
  "user_agent" TEXT,
  "ip_address" VARCHAR(80),
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "revoked_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_brapi_credentials" (
  "id" VARCHAR(100) NOT NULL,
  "user_id" VARCHAR(80) NOT NULL,
  "encrypted_token" TEXT NOT NULL,
  "token_hint" VARCHAR(32),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "user_brapi_credentials_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "players" ADD COLUMN "user_id" VARCHAR(80);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_google_subject_key" ON "users"("google_subject");
CREATE INDEX "user_sessions_user_id_idx" ON "user_sessions"("user_id");
CREATE INDEX "user_sessions_expires_at_idx" ON "user_sessions"("expires_at");
CREATE UNIQUE INDEX "user_brapi_credentials_user_id_key" ON "user_brapi_credentials"("user_id");
CREATE UNIQUE INDEX "players_user_id_key" ON "players"("user_id");

ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_brapi_credentials" ADD CONSTRAINT "user_brapi_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "players" ADD CONSTRAINT "players_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
