import { describe, expect, it } from "vitest";
import { HealthController } from "../src/modules/health/health.controller.js";

describe("HealthController", () => {
  it("returns API health status", () => {
    const controller = new HealthController();

    expect(controller.getHealth()).toEqual({
      status: "ok",
      service: "fortuna-api"
    });
  });
});
