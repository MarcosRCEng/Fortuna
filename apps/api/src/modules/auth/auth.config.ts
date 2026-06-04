import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

export interface AuthConfig {
  accessTokenSecret: string;
  refreshTokenSecret: string;
  accessTokenTtlSeconds: number;
  refreshTokenTtlDays: number;
  cookieName: string;
  cookieSecure: boolean;
  cookieSameSite: "lax" | "strict" | "none";
  googleClientId?: string;
  googleClientSecret?: string;
  googleCallbackUrl: string;
  webAppUrl: string;
}

loadLocalEnvFiles();

export function readAuthConfig(): AuthConfig {
  return {
    accessTokenSecret:
      process.env.AUTH_ACCESS_TOKEN_SECRET ?? "fortuna-dev-access-secret",
    refreshTokenSecret:
      process.env.AUTH_REFRESH_TOKEN_SECRET ?? "fortuna-dev-refresh-secret",
    accessTokenTtlSeconds: Number.parseInt(
      process.env.AUTH_ACCESS_TOKEN_TTL_SECONDS ?? "900",
      10,
    ),
    refreshTokenTtlDays: Number.parseInt(
      process.env.AUTH_REFRESH_TOKEN_TTL_DAYS ?? "7",
      10,
    ),
    cookieName: process.env.AUTH_COOKIE_NAME ?? "fortuna_session",
    cookieSecure: process.env.AUTH_COOKIE_SECURE === "true",
    cookieSameSite: parseSameSite(process.env.AUTH_COOKIE_SAME_SITE),
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    googleCallbackUrl:
      process.env.GOOGLE_CALLBACK_URL ??
      "http://localhost:3000/auth/google/callback",
    webAppUrl:
      process.env.WEB_APP_URL ?? process.env.WEB_ORIGIN ?? "http://localhost:5173",
  };
}

function loadLocalEnvFiles(): void {
  if (process.env.NODE_ENV === "test" || process.env.VITEST) {
    return;
  }

  const root = findWorkspaceRoot(process.cwd());
  const env: Record<string, string> = {};
  for (const file of [
    join(root, ".env"),
    join(root, ".env.local"),
    join(root, "apps", "api", ".env"),
    join(root, "apps", "api", ".env.local"),
  ]) {
    readDotEnv(file, env);
  }

  for (const [key, value] of Object.entries(env)) {
    process.env[key] ??= value;
  }
}

function findWorkspaceRoot(start: string): string {
  let current = start;
  while (!existsSync(join(current, "pnpm-workspace.yaml"))) {
    const parent = dirname(current);
    if (parent === current) {
      return start;
    }
    current = parent;
  }
  return current;
}

function readDotEnv(file: string, env: Record<string, string>): void {
  if (!existsSync(file)) {
    return;
  }

  for (const line of readFileSync(file, "utf8").split(/\r?\n/u)) {
    if (!line.trim() || line.trimStart().startsWith("#")) {
      continue;
    }
    const match = /^\s*([^=]+?)\s*=\s*(.*)\s*$/u.exec(line);
    if (!match) {
      continue;
    }
    env[match[1].trim()] = unquoteEnvValue(match[2].trim());
  }
}

function unquoteEnvValue(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function parseSameSite(value?: string): AuthConfig["cookieSameSite"] {
  const normalized = value?.toLowerCase();
  if (normalized === "strict" || normalized === "none") {
    return normalized;
  }
  return "lax";
}

