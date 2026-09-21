import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const sourcePath = path.resolve("outputs", "game-pack-003", "Page302_GamePack003_Data_Collection.xlsx");
const outputPath = path.resolve("outputs", "game-pack-003", "Page302_GamePack003_Data_Collection_unlimited-manager-games.xlsx");

const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(sourcePath));
for (let slot = 1; slot <= 11; slot += 1) {
  const sheet = workbook.worksheets.getItem(`Club ${String(slot).padStart(2, "0")}`);
  // Historic Premier League seasons can exceed 38 matches, so manager-game cells have no ceiling.
  sheet.getRange("B9:G9").dataValidation = null;
}

await fs.mkdir(path.dirname(outputPath), { recursive: true });
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);

const check = await workbook.inspect({
  kind: "table",
  range: "Club 01!A3:L33",
  include: "values,formulas",
  tableMaxRows: 31,
  tableMaxCols: 12,
});
await fs.writeFile(`${outputPath}.inspect.ndjson`, check.ndjson);
const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 50 },
  summary: "formula error scan",
});
await fs.writeFile(`${outputPath}.errors.ndjson`, errors.ndjson);
const preview = await workbook.render({ sheetName: "Club 01", range: "A1:L35", scale: 1, format: "png" });
await fs.writeFile(`${outputPath}.preview.png`, new Uint8Array(await preview.arrayBuffer()));
console.log(`Created ${outputPath}`);
