import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@fortuna/application": fileURLToPath(
        new URL("../application/src/index.ts", import.meta.url),
      ),
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
      exclude: ["src/index.ts", "prisma/**"],
      thresholds: {
        statements: 28,
        branches: 70,
        functions: 70,
        lines: 28,
      },
    },
  },
});
