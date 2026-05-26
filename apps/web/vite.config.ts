import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: Number.parseInt(process.env.WEB_PORT ?? "5173", 10)
  },
  test: {
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/main.tsx", "src/**/*.d.ts", "src/services/**"],
      thresholds: {
        statements: 24,
        branches: 75,
        functions: 60,
        lines: 24,
      },
    },
  },
});
