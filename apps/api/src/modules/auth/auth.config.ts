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

function parseSameSite(value?: string): AuthConfig["cookieSameSite"] {
  const normalized = value?.toLowerCase();
  if (normalized === "strict" || normalized === "none") {
    return normalized;
  }
  return "lax";
}

