import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUTPUT_PATH = join(ROOT, "data", "skills.json");
const API_BASE = "https://heroes.thelazy.net/api.php?action=parse&prop=wikitext&format=json&page=";
const FILE_REDIRECT = "https://heroes.thelazy.net/index.php?title=Special:Redirect/file/";

const SKILLS = [
  { name: "Air Magic", pageTitle: "Air_Magic" },
  { name: "Archery", pageTitle: "Archery" },
  { name: "Armorer", pageTitle: "Armorer" },
  { name: "Artillery", pageTitle: "Artillery" },
  { name: "Ballistics", pageTitle: "Ballistics" },
  { name: "Diplomacy", pageTitle: "Diplomacy" },
  { name: "Eagle Eye", pageTitle: "Eagle_Eye" },
  { name: "Earth Magic", pageTitle: "Earth_Magic" },
  { name: "Estates", pageTitle: "Estates" },
  { name: "Fire Magic", pageTitle: "Fire_Magic" },
  { name: "First Aid", pageTitle: "First_Aid" },
  { name: "Intelligence", pageTitle: "Intelligence" },
  { name: "Interference", pageTitle: "Interference", hotaOnly: true },
  { name: "Leadership", pageTitle: "Leadership" },
  { name: "Learning", pageTitle: "Learning" },
  { name: "Logistics", pageTitle: "Logistics" },
  { name: "Luck", pageTitle: "Luck_(secondary_skill)" },
  { name: "Mysticism", pageTitle: "Mysticism" },
  { name: "Navigation", pageTitle: "Navigation" },
  { name: "Necromancy", pageTitle: "Necromancy" },
  { name: "Offense", pageTitle: "Offense" },
  { name: "Pathfinding", pageTitle: "Pathfinding" },
  { name: "Resistance", pageTitle: "Resistance" },
  { name: "Runes", pageTitle: "Runes", hotaOnly: true },
  { name: "Scholar", pageTitle: "Scholar" },
  { name: "Scouting", pageTitle: "Scouting" },
  { name: "Sorcery", pageTitle: "Sorcery" },
  { name: "Tactics", pageTitle: "Tactics" },
  { name: "Water Magic", pageTitle: "Water_Magic" },
  { name: "Wisdom", pageTitle: "Wisdom" },
];

function fetchJson(url) {
  const output = execFileSync("curl", ["-L", "-A", "Mozilla/5.0", url], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });

  return JSON.parse(output);
}

function extractTemplateValue(wikitext, key, nextKeys = []) {
  const nextPattern = nextKeys.length > 0 ? `\\n\\s*\\|\\s*(?:${nextKeys.join("|")})\\s*=` : "\\n\\s*\\}\\}";
  const regex = new RegExp(`\\|\\s*${key}\\s*=\\s*([\\s\\S]*?)${nextPattern}`);
  const match = wikitext.match(regex);
  return match ? cleanWikitext(match[1]) : "";
}

function cleanWikitext(text) {
  return text
    .replace(/\{\{gt\|([^}]+)\}\}/g, "$1")
    .replace(/\{\{rt\|([^}]+)\}\}/g, "$1")
    .replace(/\{\{[^}]+\}\}/g, "")
    .replace(/\[\[([^|\]]+)\|([^|\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/''+/g, "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildFileName(prefix, name, suffix) {
  const safeName = name.replace(/\s+/g, "_");
  return `${prefix}_${safeName}_${suffix}.png`;
}

function buildRedirectUrl(fileName) {
  return `${FILE_REDIRECT}${encodeURIComponent(fileName)}`;
}

function buildPageUrl(pageTitle) {
  return `https://heroes.thelazy.net/index.php/${encodeURIComponent(pageTitle).replace(/%20/g, "_")}`;
}

function parseStartingHeroes(wikitext) {
  return Array.from(wikitext.matchAll(/\{\{H2\|([^|}]+)\|([^}]+)\}\}/g)).map((match) => ({
    name: match[1].trim(),
    className: match[2].trim(),
    pageUrl: buildPageUrl(match[1].trim().replace(/\s+/g, "_")),
  }));
}

function scrapeSkill(skill) {
  const url = `${API_BASE}${encodeURIComponent(skill.pageTitle)}`;
  const parsed = fetchJson(url);
  const wikitext = parsed?.parse?.wikitext?.["*"] || "";

  const basic = extractTemplateValue(wikitext, "B_effect", ["A_effect"]);
  const advanced = extractTemplateValue(wikitext, "A_effect", ["E_effect"]);
  const expert = extractTemplateValue(wikitext, "E_effect");

  return {
    name: skill.name,
    pageUrl: buildPageUrl(skill.pageTitle),
    hotaOnly: Boolean(skill.hotaOnly),
    iconUrl: buildRedirectUrl(buildFileName("Expert", skill.name, "small")),
    iconUrls: {
      small: buildRedirectUrl(buildFileName("Expert", skill.name, "small")),
      basic: buildRedirectUrl(buildFileName("Basic", skill.name, "large")),
      advanced: buildRedirectUrl(buildFileName("Advanced", skill.name, "large")),
      expert: buildRedirectUrl(buildFileName("Expert", skill.name, "large")),
    },
    effects: {
      basic,
      advanced,
      expert,
    },
    startingHeroes: parseStartingHeroes(wikitext),
  };
}

mkdirSync(dirname(OUTPUT_PATH), { recursive: true });

const results = SKILLS.map(scrapeSkill);
writeFileSync(OUTPUT_PATH, `${JSON.stringify(results, null, 2)}\n`);

console.log(`Wrote ${results.length} skills to ${OUTPUT_PATH}`);
