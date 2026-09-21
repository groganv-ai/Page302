import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const workbookPath = path.resolve("outputs", "game-pack-003", "Page302_GamePack003_Data_Collection_unlimited-manager-games.xlsx");
const masterPath = path.resolve("outputs", "historical-club-list", "Historical Premier League Club list - completed.xlsx");
const replacement = { canonicalClub: "Queens Park Rangers", season: "1992-93" };

const master = await SpreadsheetFile.importXlsx(await FileBlob.load(masterPath));
const catalogueRows = await master.worksheets.getItem("All Teams").getRange("A1:T687").values;
const headers = catalogueRows[0];
const column = Object.fromEntries(headers.map((header, index) => [header, index]));
const record = catalogueRows.slice(1).find((row) =>
  row[column["Canonical club"]] === replacement.canonicalClub && row[column.Season] === replacement.season,
);
if (!record || record[column["Sky 6"]] === "Yes") {
  throw new Error("The replacement must be a valid non-Sky-Six Premier League club-season.");
}

const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(workbookPath));
const planner = workbook.worksheets.getItem("Pack Planner");
const slotTenCategory = (await planner.getRange("B20").values)[0][0];
if (slotTenCategory !== "Not currently in the Premier League") {
  throw new Error("Slot 10 is no longer the expected category.");
}
planner.getRange("C20:F20").values = [[
  record[column["Display name"]],
  record[column.Season],
  `${record[column["Short code"]]}${record[column.Season].slice(2, 4)}${record[column.Season].slice(5, 7)}`,
  record[column.Era],
]];

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(workbookPath);
const check = await workbook.inspect({
  kind: "table",
  range: "Pack Planner!A10:I21",
  include: "values,formulas",
  tableMaxRows: 12,
  tableMaxCols: 9,
});
await fs.writeFile(`${workbookPath}.replacement.inspect.ndjson`, check.ndjson);
const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 50 },
  summary: "formula error scan",
});
await fs.writeFile(`${workbookPath}.replacement.errors.ndjson`, errors.ndjson);
const preview = await workbook.render({ sheetName: "Pack Planner", range: "A1:I30", scale: 1, format: "png" });
await fs.writeFile(`${workbookPath}.replacement.preview.png`, new Uint8Array(await preview.arrayBuffer()));
console.log(`Replaced Blackburn with ${record[column["Display name"]]} ${record[column.Season]}.`);
