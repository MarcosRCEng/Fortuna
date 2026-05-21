import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: Number.parseInt(process.env.WEB_PORT ?? "5173", 10)
  }
});
