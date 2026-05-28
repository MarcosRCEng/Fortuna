import { INestApplication } from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeTestApp, createTestApp, readJson } from "./test-http.js";

interface PlayerResponse {
  id: string;
}

interface AssetResponse {
  id: string;
  symbol: string;
}

interface MentorMessagesResponse {
  items: Array<{ id: string; trigger: string; readAt: string | null }>;
}

describe("Game Loop and Education API E2E", () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeEach(async () => {
    ({ app, baseUrl } = await createTestApp());
  });

  afterEach(async () => {
    await closeTestApp(app);
  });

  async function createPlayer() {
    const response = await readJson<PlayerResponse>(
      await fetch(`${baseUrl}/players`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Education Player",
          initialBalanceCents: 200_000,
        }),
      }),
    );
    return response.body;
  }

  async function buyFirstAsset(playerId: string) {
    const assets = await readJson<AssetResponse[]>(
      await fetch(`${baseUrl}/assets`),
    );
    const asset = assets.body.find((item) => item.symbol === "FIISF001")!;
    const order = await readJson<unknown>(
      await fetch(`${baseUrl}/players/${playerId}/orders/buy`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assetId: asset.id, quantity: "1" }),
      }),
    );
    expect(order.status).toBe(200);
    return asset;
  }

  it("creates a mentor message after the first buy", async () => {
    const player = await createPlayer();
    await buyFirstAsset(player.id);

    const response = await readJson<MentorMessagesResponse>(
      await fetch(`${baseUrl}/players/${player.id}/mentor/messages`),
    );

    expect(response.status).toBe(200);
    expect(response.body.items.map((item) => item.trigger)).toContain(
      "first_purchase",
    );
  });

  it("marks a mentor message as read", async () => {
    const player = await createPlayer();
    await buyFirstAsset(player.id);
    const messages = await readJson<MentorMessagesResponse>(
      await fetch(`${baseUrl}/players/${player.id}/mentor/messages`),
    );
    const messageId = messages.body.items[0]!.id;

    const marked = await readJson<{ ok: true }>(
      await fetch(
        `${baseUrl}/players/${player.id}/mentor/messages/${messageId}/read`,
        {
          method: "POST",
        },
      ),
    );
    const updated = await readJson<MentorMessagesResponse>(
      await fetch(`${baseUrl}/players/${player.id}/mentor/messages`),
    );

    expect(marked.status).toBe(200);
    expect(marked.body.ok).toBe(true);
    expect(
      updated.body.items.find((item) => item.id === messageId)?.readAt,
    ).toEqual(expect.any(String));
  });

  it("returns the latest mentor message", async () => {
    const player = await createPlayer();
    await buyFirstAsset(player.id);

    const response = await readJson<{
      message: { id: string; trigger: string } | null;
    }>(await fetch(`${baseUrl}/players/${player.id}/mentor/latest`));

    expect(response.status).toBe(200);
    expect(response.body.message).not.toBeNull();
    expect(response.body.message?.id).toEqual(expect.any(String));
  });

  it("returns player missions", async () => {
    const player = await createPlayer();
    const response = await readJson<{
      missions: Array<{ id: string; title: string }>;
    }>(await fetch(`${baseUrl}/players/${player.id}/missions`));

    expect(response.status).toBe(200);
    expect(response.body.missions.length).toBeGreaterThan(0);
  });

  it("returns the city state", async () => {
    const player = await createPlayer();
    const response = await readJson<{
      playerId: string;
      level: number;
      totalPatrimonyCents: number;
    }>(await fetch(`${baseUrl}/players/${player.id}/city`));

    expect(response.status).toBe(200);
    expect(response.body.playerId).toBe(player.id);
    expect(response.body.level).toBeGreaterThanOrEqual(1);
    expect(Number.isInteger(response.body.totalPatrimonyCents)).toBe(true);
  });

  it("returns the game loop state", async () => {
    const player = await createPlayer();
    await buyFirstAsset(player.id);

    const response = await readJson<{
      player: { id: string; level: number };
      wallet: { availableBalanceCents: number };
      portfolio: { totalPatrimonyCents: number };
      missions: { active: unknown[] };
      city: { level: number };
    }>(await fetch(`${baseUrl}/players/${player.id}/game-loop/state`));

    expect(response.status).toBe(200);
    expect(response.body.player.id).toBe(player.id);
    expect(response.body.player.level).toBeGreaterThanOrEqual(1);
    expect(response.body.missions.active.length).toBeGreaterThan(0);
    expect(Number.isInteger(response.body.wallet.availableBalanceCents)).toBe(
      true,
    );
    expect(Number.isInteger(response.body.portfolio.totalPatrimonyCents)).toBe(
      true,
    );
  });
});
