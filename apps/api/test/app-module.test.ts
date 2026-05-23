import { Test } from "@nestjs/testing";
import { describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module.js";
import { AssetsController } from "../src/modules/assets/assets.controller.js";
import { HealthController } from "../src/modules/health/health.controller.js";
import { MarketController } from "../src/modules/market/market.controller.js";
import { MentorController } from "../src/modules/mentor/mentor.controller.js";
import { PlayerApiService } from "../src/modules/player/player-api.service.js";
import { PlayerController } from "../src/modules/player/player.controller.js";

describe("AppModule", () => {
  it("resolves registered controllers and shared API service", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    expect(moduleRef.get(HealthController)).toBeInstanceOf(HealthController);
    expect(moduleRef.get(PlayerController)).toBeInstanceOf(PlayerController);
    expect(moduleRef.get(AssetsController)).toBeInstanceOf(AssetsController);
    expect(moduleRef.get(MarketController)).toBeInstanceOf(MarketController);
    expect(moduleRef.get(MentorController)).toBeInstanceOf(MentorController);
    expect(moduleRef.get(PlayerApiService)).toBeInstanceOf(PlayerApiService);

    await moduleRef.close();
  });
});
