import { existsSync, statSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BUILDING_IDS = [
  "financial_hall",
  "reserve_bank",
  "city_exchange",
  "real_estate_center",
  "financial_school",
  "income_park",
  "mentor_tower",
];

const STAGES = [0, 1, 2, 3];
const MIN_ASSET_BYTES = 1024;
const scriptDir = dirname(fileURLToPath(import.meta.url));
const assetsDir = join(scriptDir, "..", "public", "assets", "city", "buildings");

const missingOrInvalidAssets = [];

for (const buildingId of BUILDING_IDS) {
  for (const stage of STAGES) {
    const fileName = `building_${buildingId}_stage_${stage}.png`;
    const filePath = join(assetsDir, fileName);

    if (extname(filePath) !== ".png") {
      missingOrInvalidAssets.push(`${fileName}: extensao invalida`);
      continue;
    }

    if (!existsSync(filePath)) {
      missingOrInvalidAssets.push(`${fileName}: arquivo ausente`);
      continue;
    }

    const assetStats = statSync(filePath);

    if (!assetStats.isFile()) {
      missingOrInvalidAssets.push(`${fileName}: nao e arquivo`);
      continue;
    }

    if (assetStats.size < MIN_ASSET_BYTES) {
      missingOrInvalidAssets.push(`${fileName}: arquivo vazio ou pequeno demais`);
    }
  }
}

if (missingOrInvalidAssets.length > 0) {
  console.error("Assets da Cidade Fortuna invalidos:");

  for (const issue of missingOrInvalidAssets) {
    console.error(`- ${issue}`);
  }

  process.exit(1);
}

console.log(
  `Assets da Cidade Fortuna validados: ${BUILDING_IDS.length} predios x ${STAGES.length} stages.`,
);
