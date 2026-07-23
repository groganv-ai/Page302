import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const masterPath = path.resolve("outputs", "historical-club-list", "Historical Premier League Club list - completed.xlsx");
const templatePath = path.resolve("outputs", "game-pack-template", "Page302_GamePack003_Data_Collection.xlsx");
const outputPath = path.resolve("outputs", "game-pack-003", "Page302_GamePack003_Data_Collection.xlsx");

// The required 4 / 5 / 2 mix.  Each entry is checked against the master club-season catalogue below.
const selection = [
  ["Sky 6", "Liverpool", "1995-96"],
  ["Sky 6", "Manchester United", "2007-08"],
  ["Sky 6", "Arsenal", "2023-24"],
  ["Sky 6", "Chelsea", "2013-14"],
  ["Other current Premier League club", "Newcastle United", "2002-03"],
  ["Other current Premier League club", "Brighton & Hove Albion", "2022-23"],
  ["Other current Premier League club", "Crystal Palace", "1994-95"],
  ["Other current Premier League club", "Fulham", "2010-11"],
  ["Other current Premier League club", "Bournemouth", "2018-19"],
  ["Not currently in the Premier League", "Blackburn Rovers", "1994-95"],
  ["Not currently in the Premier League", "Swansea City", "2011-12"],
];

function teamCode(shortCode, season) {
  const [start, end] = season.split("-");
  return `${shortCode}${start.slice(2)}${end}`;
}

const master = await SpreadsheetFile.importXlsx(await FileBlob.load(masterPath));
const catalogue = master.worksheets.getItem("All Teams");
const catalogueRows = await catalogue.getRange("A1:T687").values;
const headers = catalogueRows[0];
const column = Object.fromEntries(headers.map((header, index) => [header, index]));

const chosenRows = selection.map(([category, canonicalClub, season]) => {
  const record = catalogueRows.slice(1).find((row) =>
    row[column["Canonical club"]] === canonicalClub && row[column.Season] === season,
  );
  if (!record) throw new Error(`Could not find ${canonicalClub} ${season} in the master catalogue.`);
  const isSkySix = record[column["Sky 6"]] === "Yes";
  if ((category === "Sky 6") !== isSkySix) {
    throw new Error(`${canonicalClub} ${season} does not match the selected category.`);
  }
  return {
    category,
    club: record[column["Display name"]],
    season: record[column.Season],
    code: teamCode(record[column["Short code"]], record[column.Season]),
    era: record[column.Era],
  };
});

const categoryCounts = Object.fromEntries(
  ["Sky 6", "Other current Premier League club", "Not currently in the Premier League"]
    .map((category) => [category, chosenRows.filter((row) => row.category === category).length]),
);
if (categoryCounts["Sky 6"] !== 4 || categoryCounts["Other current Premier League club"] !== 5 || categoryCounts["Not currently in the Premier League"] !== 2) {
  throw new Error("The Pack 003 selection must use the 4 / 5 / 2 composition.");
}

const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(templatePath));
const planner = workbook.worksheets.getItem("Pack Planner");
planner.getRange("C11:F21").values = chosenRows.map((row) => [row.club, row.season, row.code, row.era]);

await fs.mkdir(path.dirname(outputPath), { recursive: true });
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);

const check = await workbook.inspect({
  kind: "table",
  range: "Pack Planner!A6:I30",
  include: "values,formulas",
  tableMaxRows: 30,
  tableMaxCols: 9,
});
await fs.writeFile(`${outputPath}.inspect.ndjson`, check.ndjson);
const formulaErrors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 50 },
  summary: "Pack 003 formula error scan",
});
await fs.writeFile(`${outputPath}.errors.ndjson`, formulaErrors.ndjson);
const preview = await workbook.render({ sheetName: "Pack Planner", range: "A1:I30", scale: 1, format: "png" });
await fs.writeFile(`${outputPath}.preview.png`, new Uint8Array(await preview.arrayBuffer()));
const clubPreview = await workbook.render({ sheetName: "Club 01", range: "A1:L20", scale: 1, format: "png" });
await fs.writeFile(`${outputPath}.club-preview.png`, new Uint8Array(await clubPreview.arrayBuffer()));

console.log(JSON.stringify({ selected: chosenRows, categoryCounts }, null, 2));
console.log(`Created ${outputPath}`);
