import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@fortuna/domain": fileURLToPath(
        new URL("../domain/src/index.ts", import.meta.url),
      ),
    },
  },
  test: {
    globals: true,
    include: ["test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      thresholds: {
        statements: 75,
        branches: 75,
        functions: 75,
        lines: 75,
      },
    },
  },
});
