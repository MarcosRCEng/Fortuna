import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/main.ts", "src/**/*.dto.ts"],
      thresholds: {
        statements: 60,
        branches: 65,
        functions: 55,
        lines: 60,
      },
    },
  }
});
