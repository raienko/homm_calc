import fs from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const publicDir = path.join(rootDir, "public");
const datasetFiles = [
  "data/artifacts.json",
  "data/castles.json",
  "data/creatures.json",
  "data/heroes.json",
  "data/skills.json",
  "data/spells.json",
];

function isLocalAssetPath(value) {
  return typeof value === "string" && value.startsWith("game-assets/wiki/");
}

function isValidImageSignature(buffer) {
  const signature = buffer.subarray(0, 8).toString("hex");
  return (
    signature.startsWith("89504e47") ||
    signature.startsWith("47494638") ||
    signature.startsWith("52494646") ||
    signature.startsWith("ffd8ff")
  );
}

function walk(value, callback, trail = "") {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => walk(entry, callback, `${trail}[${index}]`));
    return;
  }

  if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, entry]) => walk(entry, callback, trail ? `${trail}.${key}` : key));
    return;
  }

  callback(value, trail);
}

async function main() {
  const missing = [];
  const invalid = [];
  const seenPaths = new Set();
  const counts = {};

  for (const datasetFile of datasetFiles) {
    const absoluteFile = path.join(rootDir, datasetFile);
    const data = JSON.parse(await fs.readFile(absoluteFile, "utf8"));
    let count = 0;

    walk(data, async () => {});

    const pending = [];
    walk(data, (value, trail) => {
      if (!isLocalAssetPath(value)) {
        return;
      }

      count += 1;
      seenPaths.add(value);

      pending.push((async () => {
        const assetPath = path.join(publicDir, value);

        try {
          const buffer = await fs.readFile(assetPath);
          if (!isValidImageSignature(buffer)) {
            invalid.push({ datasetFile, trail, value });
          }
        } catch {
          missing.push({ datasetFile, trail, value });
        }
      })());
    });

    counts[datasetFile] = count;
    await Promise.all(pending);
  }

  console.log(JSON.stringify({
    datasets: counts,
    uniqueLocalAssetPaths: seenPaths.size,
    missingCount: missing.length,
    invalidCount: invalid.length,
    missing: missing.slice(0, 50),
    invalid: invalid.slice(0, 50),
  }, null, 2));

  if (missing.length > 0 || invalid.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
