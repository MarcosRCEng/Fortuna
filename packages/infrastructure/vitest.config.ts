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
  },
});
