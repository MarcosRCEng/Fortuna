import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      thresholds: {
        statements: 85,
        branches: 85,
        functions: 70,
        lines: 85,
      },
    },
  }
});
