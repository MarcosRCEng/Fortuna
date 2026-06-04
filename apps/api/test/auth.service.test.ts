import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AuthService } from "../src/modules/auth/auth.service.js";
import { PlayerApiService } from "../src/modules/player/player-api.service.js";

const googleProfile = {
  subject: "google-subject-1",
  email: "player@example.com",
  emailVerified: true,
  name: "Jogadora Fortuna",
  avatarUrl: "https://example.com/avatar.png",
};

function createAuthService(): AuthService {
  return new AuthService(new PlayerApiService());
}

describe("AuthService", () => {
  const originalGoogleClientId = process.env.GOOGLE_CLIENT_ID;
  const originalGoogleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

  beforeEach(() => {
    if (originalGoogleClientId === undefined) {
      delete process.env.GOOGLE_CLIENT_ID;
    } else {
      process.env.GOOGLE_CLIENT_ID = originalGoogleClientId;
    }
    if (originalGoogleClientSecret === undefined) {
      delete process.env.GOOGLE_CLIENT_SECRET;
    } else {
      process.env.GOOGLE_CLIENT_SECRET = originalGoogleClientSecret;
    }
  });

  afterEach(() => {
    if (originalGoogleClientId === undefined) {
      delete process.env.GOOGLE_CLIENT_ID;
    } else {
      process.env.GOOGLE_CLIENT_ID = originalGoogleClientId;
    }
    if (originalGoogleClientSecret === undefined) {
      delete process.env.GOOGLE_CLIENT_SECRET;
    } else {
      process.env.GOOGLE_CLIENT_SECRET = originalGoogleClientSecret;
    }
  });

  it("returns a controlled error when GOOGLE_CLIENT_ID is not configured", () => {
    delete process.env.GOOGLE_CLIENT_ID;
    const auth = createAuthService();

    expect(() => auth.buildGoogleAuthorizationRequest()).toThrow(
      "GOOGLE_CLIENT_ID nao configurado.",
    );
  });

  it("builds the Google authorization request when GOOGLE_CLIENT_ID is configured", () => {
    process.env.GOOGLE_CLIENT_ID =
      "test-client-id.apps.googleusercontent.com";
    process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
    const auth = createAuthService();

    const authorization = auth.buildGoogleAuthorizationRequest();

    expect(authorization.url).toContain(
      "client_id=test-client-id.apps.googleusercontent.com",
    );
  });

  it("returns a controlled error when GOOGLE_CLIENT_SECRET is not configured", () => {
    process.env.GOOGLE_CLIENT_ID =
      "test-client-id.apps.googleusercontent.com";
    delete process.env.GOOGLE_CLIENT_SECRET;
    const auth = createAuthService();

    expect(() => auth.buildGoogleAuthorizationRequest()).toThrow(
      "Credenciais Google OAuth nao configuradas.",
    );
  });

  it("creates a user and player on the first Google login", async () => {
    const auth = createAuthService();

    const user = await auth.validateGoogleUser(googleProfile);

    expect(user.email).toBe("player@example.com");
    expect(user.playerId).toMatch(/^player-/);
  });

  it("reuses the same user and player on later Google logins", async () => {
    const auth = createAuthService();

    const firstLogin = await auth.validateGoogleUser(googleProfile);
    const secondLogin = await auth.validateGoogleUser({
      ...googleProfile,
      name: "Nome atualizado",
    });

    expect(secondLogin.id).toBe(firstLogin.id);
    expect(secondLogin.playerId).toBe(firstLogin.playerId);
  });

  it("restores the current user from a valid session cookie", async () => {
    const auth = createAuthService();
    const user = await auth.validateGoogleUser(googleProfile);
    const session = await auth.createSession(user, { headers: {} });

    const currentUser = await auth.authenticateRequest({
      headers: {
        cookie: auth.cookieHeader(session.token, session.expiresAt),
      },
    });

    expect(currentUser).toMatchObject({
      id: user.id,
      email: user.email,
      playerId: user.playerId,
    });
  });

  it("does not authenticate without a session cookie", async () => {
    const auth = createAuthService();

    await expect(auth.authenticateRequest({ headers: {} })).resolves.toBeUndefined();
  });

  it("validates OAuth state from the HttpOnly state cookie", () => {
    const auth = createAuthService();
    const state = "oauth-state";
    const expiresAt = new Date(Date.now() + 60_000);

    expect(
      auth.validateOAuthState(
        {
          headers: {
            cookie: auth.oauthStateCookieHeader(state, expiresAt),
          },
        },
        state,
      ),
    ).toBe(true);
    expect(
      auth.validateOAuthState(
        {
          headers: {
            cookie: auth.oauthStateCookieHeader(state, expiresAt),
          },
        },
        "different-state",
      ),
    ).toBe(false);
  });

  it("rejects an unverified Google email", async () => {
    const auth = createAuthService();

    await expect(
      auth.validateGoogleUser({ ...googleProfile, emailVerified: false }),
    ).rejects.toThrow("Email Google nao verificado.");
  });

  it("revokes the session on logout", async () => {
    const auth = createAuthService();
    const user = await auth.validateGoogleUser(googleProfile);
    const session = await auth.createSession(user, { headers: {} });
    const sessionId = session.token.split(".")[0];

    await auth.revokeSession(sessionId);

    await expect(
      auth.authenticateRequest({
        headers: {
          cookie: auth.cookieHeader(session.token, session.expiresAt),
        },
      }),
    ).resolves.toBeUndefined();
  });
});
