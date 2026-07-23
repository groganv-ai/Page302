import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const workbookPath = path.resolve("outputs", "game-pack-003", "Page302_GamePack003_Final.xlsx");
const outputDirectory = path.resolve("data", "vggfax003");
const aggregatePath = path.resolve("data", "vggfax003.json");
const packNumber = "003";
const rerollFormation = process.argv.includes("--reroll-formation");
const supportedFormations = ["4-4-2", "4-3-3", "5-4-1", "4-5-1"];
const legacyFormation = "5-4-1";

const positionMap = { GK: "GK", DF: "DF", MF: "MD", FW: "AT" };
const surnamePrefixes = new Set(["da", "de", "del", "della", "der", "di", "dos", "la", "le", "van", "von"]);

function toNumber(value, label) {
  const number = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
  if (!Number.isFinite(number)) throw new Error(`${label} must be a number.`);
  return number;
}

function toPositions(value, label) {
  const positions = String(value ?? "")
    .split(",")
    .map((position) => position.trim())
    .filter(Boolean)
    .map((position) => positionMap[position]);
  if (positions.length === 0 || positions.some((position) => !position)) {
    throw new Error(`${label} has an unsupported FBref position: ${value}`);
  }
  return [...new Set(positions)];
}

function surnameFrom(fullname) {
  const words = String(fullname).trim().split(/\s+/);
  if (words.length === 1) return words[0];
  const prefix = words[words.length - 2].toLowerCase();
  return surnamePrefixes.has(prefix)
    ? `${words[words.length - 2]} ${words[words.length - 1]}`
    : words[words.length - 1];
}

function idPart(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
}

function chooseFormation() {
  return supportedFormations[Math.floor(Math.random() * supportedFormations.length)];
}

async function resolveFormation() {
  if (rerollFormation) return chooseFormation();

  try {
    const existingPack = JSON.parse(await fs.readFile(aggregatePath, "utf8"));
    if (Array.isArray(existingPack)) return legacyFormation;
    if (!supportedFormations.includes(existingPack.formation)) {
      throw new Error(`VGGFAX ${packNumber} has invalid formation '${existingPack.formation}'.`);
    }
    return existingPack.formation;
  }
  catch (error) {
    if (error.code === "ENOENT") return legacyFormation;
    throw error;
  }
}

const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(workbookPath));
const planner = workbook.worksheets.getItem("Pack Planner");
const plannerRows = await planner.getRange("C11:F21").values;
if (plannerRows.length !== 11 || plannerRows.some((row) => row.some((value) => !value))) {
  throw new Error("Pack Planner must have 11 complete club rows before exporting.");
}

const clubs = [];
for (const [slotIndex, [club, season, clubCode]] of plannerRows.entries()) {
  const sheet = workbook.worksheets.getItem(`Club ${String(slotIndex + 1).padStart(2, "0")}`);
  const managerNames = (await sheet.getRange("B8:G8").values)[0];
  const managerGames = (await sheet.getRange("B9:G9").values)[0];
  const playerRows = await sheet.getRange("B14:L55").values;
  const squad = [];
  const usedIds = new Set();

  for (let managerIndex = 0; managerIndex < managerNames.length; managerIndex += 1) {
    const fullname = managerNames[managerIndex];
    const appearances = managerGames[managerIndex];
    if (!fullname && !appearances) continue;
    if (!fullname || appearances === null || appearances === "") {
      throw new Error(`${clubCode}: each manager needs both a name and games managed.`);
    }
    const id = `${clubCode}_${idPart(fullname)}`;
    if (usedIds.has(id)) throw new Error(`${clubCode}: duplicate manager name ${fullname}.`);
    usedIds.add(id);
    squad.push({ id, fullname: String(fullname).trim(), surname: surnameFrom(fullname), positions: ["MAN"], appearances: toNumber(appearances, `${clubCode} manager games`) });
  }

  for (const [playerIndex, row] of playerRows.entries()) {
    const [fullname, , fbrefPosition, , appearances] = row;
    if (!fullname) continue;
    if (appearances === null || appearances === "") {
      throw new Error(`${clubCode}: ${fullname} has no appearances value.`);
    }
    let id = `${clubCode}_${idPart(fullname)}`;
    let duplicate = 2;
    while (usedIds.has(id)) {
      id = `${clubCode}_${idPart(fullname)}_${duplicate}`;
      duplicate += 1;
    }
    usedIds.add(id);
    squad.push({
      id,
      fullname: String(fullname).trim(),
      surname: surnameFrom(fullname),
      positions: toPositions(fbrefPosition, `${clubCode} row ${playerIndex + 14}`),
      appearances: toNumber(appearances, `${clubCode} ${fullname} appearances`),
    });
  }

  if (!squad.some((member) => member.positions.includes("MAN")) || squad.length < 2) {
    throw new Error(`${clubCode} needs a manager and at least one player.`);
  }
  clubs.push({ clubCode, club, season, competition: "Premier League", version: 2, squad });
}

const formation = await resolveFormation();
await fs.mkdir(outputDirectory, { recursive: true });
for (const club of clubs) {
  await fs.writeFile(path.join(outputDirectory, `${club.clubCode.toLowerCase()}.json`), JSON.stringify(club), "utf8");
}
await fs.writeFile(aggregatePath, JSON.stringify({ packNumber, formation, clubs }), "utf8");
const report = clubs.map((club) => ({
  clubCode: club.clubCode,
  club: club.club,
  squadMembers: club.squad.length,
  managers: club.squad.filter((member) => member.positions.includes("MAN")).length,
  players: club.squad.filter((member) => !member.positions.includes("MAN")).length,
}));
await fs.writeFile(path.resolve("outputs", "game-pack-003", "Page302_GamePack003_Final.export-report.json"), JSON.stringify(report, null, 2), "utf8");
console.log(JSON.stringify({ packNumber, formation, clubs: report }, null, 2));
