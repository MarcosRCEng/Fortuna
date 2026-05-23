import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(repoRoot, ".env");

if (existsSync(envPath)) {
  const lines = readFileSync(envPath, "utf8").split(/\r?\n/u);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const [key, ...valueParts] = trimmed.split("=");
    if (key && process.env[key] === undefined) {
      process.env[key] = valueParts.join("=").replace(/^["']|["']$/gu, "");
    }
  }
}

const executable = process.platform === "win32" ? "corepack.cmd" : "corepack";
const result = spawnSync(
  executable,
  [
    "pnpm",
    "--filter",
    "@fortuna/infrastructure",
    "exec",
    "prisma",
    ...process.argv.slice(2),
  ],
  {
    cwd: repoRoot,
    env: process.env,
    shell: process.platform === "win32",
    stdio: "inherit",
  },
);

if (result.error) {
  console.error(result.error);
}

process.exit(result.status ?? 1);
