import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

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
const remoteImagePrefix = "https://heroes.thelazy.net/images/";
const remoteRedirectPrefix = "https://heroes.thelazy.net/index.php?title=Special:Redirect/file/";
const localPrefix = "game-assets/wiki/";
const concurrency = 1;
const maxAttempts = 8;

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isRemoteAssetUrl(value) {
  return value.startsWith(remoteImagePrefix) || value.startsWith(remoteRedirectPrefix);
}

function getRedirectFileName(remoteUrl) {
  const url = new URL(remoteUrl);
  const title = url.searchParams.get("title") || "";
  const redirectPrefix = "Special:Redirect/file/";
  return title.startsWith(redirectPrefix) ? title.slice(redirectPrefix.length) : path.basename(url.pathname);
}

function getDownloadUrl(remoteUrl) {
  if (remoteUrl.startsWith(remoteImagePrefix)) {
    return remoteUrl;
  }

  const fileName = getRedirectFileName(remoteUrl);
  const md5 = crypto.createHash("md5").update(fileName).digest("hex");
  return `https://heroes.thelazy.net/images/${md5[0]}/${md5.slice(0, 2)}/${fileName}`;
}

function toLocalAssetPath(remoteUrl) {
  if (remoteUrl.startsWith(remoteImagePrefix)) {
    const url = new URL(remoteUrl);
    const relativePath = url.pathname.replace(/^\/images\//, "");
    return `${localPrefix}${relativePath}`;
  }

  return `${localPrefix}redirect/${getRedirectFileName(remoteUrl)}`;
}

function collectRemoteUrls(value, urls) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectRemoteUrls(item, urls));
    return;
  }

  if (value && typeof value === "object") {
    Object.values(value).forEach((item) => collectRemoteUrls(item, urls));
    return;
  }

  if (typeof value === "string" && isRemoteAssetUrl(value)) {
    urls.add(value);
  }
}

function rewriteImageUrls(value) {
  if (Array.isArray(value)) {
    return value.map(rewriteImageUrls);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, rewriteImageUrls(entry)]));
  }

  if (typeof value === "string" && isRemoteAssetUrl(value)) {
    return toLocalAssetPath(value);
  }

  return value;
}

async function ensureDir(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function downloadFile(remoteUrl) {
  const localAssetPath = toLocalAssetPath(remoteUrl);
  const targetPath = path.join(publicDir, localAssetPath);

  try {
    await fs.access(targetPath);
    return { remoteUrl, localAssetPath, skipped: true };
  } catch {
    // Continue to download.
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await fetch(getDownloadUrl(remoteUrl), {
      headers: {
        "user-agent": "homm3calc asset localizer",
      },
    });

    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      await ensureDir(targetPath);
      await fs.writeFile(targetPath, Buffer.from(arrayBuffer));
      return { remoteUrl, localAssetPath, skipped: false };
    }

    if ((response.status === 429 || response.status >= 500) && attempt < maxAttempts) {
      await sleep(2000 * attempt);
      continue;
    }

    throw new Error(`Failed to download ${remoteUrl}: ${response.status} ${response.statusText}`);
  }

  throw new Error(`Failed to download ${remoteUrl}`);
}

async function runPool(items, worker) {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      await worker(item);
    }
  });

  await Promise.all(workers);
}

async function main() {
  await fs.mkdir(publicDir, { recursive: true });

  const datasetEntries = await Promise.all(
    datasetFiles.map(async (file) => ({
      file,
      data: JSON.parse(await fs.readFile(path.join(rootDir, file), "utf8")),
    })),
  );

  const remoteUrls = new Set();
  datasetEntries.forEach(({ data }) => collectRemoteUrls(data, remoteUrls));

  const downloads = [];
  await runPool([...remoteUrls], async (remoteUrl) => {
    const result = await downloadFile(remoteUrl);
    downloads.push(result);
  });

  await Promise.all(
    datasetEntries.map(async ({ file, data }) => {
      const rewritten = rewriteImageUrls(data);
      await fs.writeFile(path.join(rootDir, file), `${JSON.stringify(rewritten, null, 2)}\n`);
    }),
  );

  const downloadedCount = downloads.filter((entry) => !entry.skipped).length;
  const skippedCount = downloads.filter((entry) => entry.skipped).length;
  console.log(`Localized ${remoteUrls.size} image URLs.`);
  console.log(`Downloaded ${downloadedCount} assets, reused ${skippedCount} existing files.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
