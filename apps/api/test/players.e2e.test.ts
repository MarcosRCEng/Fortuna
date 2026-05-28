import { INestApplication } from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ApiErrorBody,
  closeTestApp,
  createTestApp,
  expectApiError,
  readJson,
} from "./test-http.js";

interface PlayerResponse {
  id: string;
  name: string;
  wallet: { amountCents: number; currency: string; formatted: string };
}

interface WalletResponse {
  playerId: string;
  balanceCents: number;
  currency: string;
}

describe("Players API E2E", () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeEach(async () => {
    ({ app, baseUrl } = await createTestApp());
  });

  afterEach(async () => {
    await closeTestApp(app);
  });

  async function postPlayer(body: Record<string, unknown>) {
    return readJson<PlayerResponse | ApiErrorBody>(
      await fetch(`${baseUrl}/players`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
  }

  it("creates a player successfully", async () => {
    const response = await postPlayer({
      name: "Marcos",
      initialBalanceCents: 200_000,
    });

    expect(response.status).toBe(201);
    const body = response.body as PlayerResponse;
    expect(body).toMatchObject({
      id: expect.any(String),
      name: "Marcos",
      wallet: {
        amountCents: 200_000,
        currency: "FORTUNA",
        formatted: expect.stringContaining("F$"),
      },
    });
    expect(Number.isInteger(body.wallet.amountCents)).toBe(true);
  });

  it("creates and retrieves a player by id", async () => {
    const created = (await postPlayer({
      name: "Ana",
      initialBalanceCents: 50_000,
    })) as { status: number; body: PlayerResponse };

    const fetched = await readJson<PlayerResponse>(
      await fetch(`${baseUrl}/players/${created.body.id}`),
    );

    expect(fetched.status).toBe(200);
    expect(fetched.body).toMatchObject({
      id: created.body.id,
      name: "Ana",
      wallet: { amountCents: 50_000 },
    });
  });

  it("creates and retrieves the player wallet", async () => {
    const created = (await postPlayer({
      name: "Bia",
      initialBalanceCents: 75_000,
    })) as { body: PlayerResponse };

    const wallet = await readJson<WalletResponse>(
      await fetch(`${baseUrl}/players/${created.body.id}/wallet`),
    );

    expect(wallet.status).toBe(200);
    expect(wallet.body).toMatchObject({
      playerId: created.body.id,
      balanceCents: 75_000,
      currency: "FORTUNA",
    });
  });

  it("rejects an empty name", async () => {
    const response = await postPlayer({
      name: "",
      initialBalanceCents: 10_000,
    });

    expectApiError(
      response as { status: number; headers: Headers; body: ApiErrorBody },
      {
        status: 400,
        code: "VALIDATION_ERROR",
      },
    );
  });

  it("rejects a missing name", async () => {
    const response = await postPlayer({ initialBalanceCents: 10_000 });

    expectApiError(
      response as { status: number; headers: Headers; body: ApiErrorBody },
      {
        status: 400,
        code: "VALIDATION_ERROR",
      },
    );
  });

  it("rejects a negative initial balance", async () => {
    const response = await postPlayer({
      name: "Saldo Negativo",
      initialBalanceCents: -1,
    });

    expectApiError(
      response as { status: number; headers: Headers; body: ApiErrorBody },
      {
        status: 400,
        code: "INVALID_MONEY_AMOUNT",
      },
    );
  });

  it("rejects a decimal initial balance", async () => {
    const response = await postPlayer({
      name: "Saldo Decimal",
      initialBalanceCents: 1_000.5,
    });

    expectApiError(
      response as { status: number; headers: Headers; body: ApiErrorBody },
      {
        status: 400,
        code: "VALIDATION_ERROR",
      },
    );
  });

  it("uses the domain default when initialBalanceCents is omitted", async () => {
    const response = await postPlayer({ name: "Sem Saldo Inicial" });

    expect(response.status).toBe(201);
    expect((response.body as PlayerResponse).wallet.amountCents).toBe(20_000);
  });
});
