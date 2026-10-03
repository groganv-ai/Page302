import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const sourcePath = "C:\\Users\\vince\\Downloads\\Page302_GamePack003_Data_Collection_old.xlsm";
const templatePath = path.resolve("outputs", "game-pack-003", "Page302_GamePack003_Data_Collection_unlimited-manager-games.xlsx");
const outputPath = path.resolve("outputs", "game-pack-003", "Page302_GamePack003_Final.xlsx");

const source = await SpreadsheetFile.importXlsx(await FileBlob.load(sourcePath));
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(templatePath));

for (let slot = 1; slot <= 11; slot += 1) {
  const sheetName = `Club ${String(slot).padStart(2, "0")}`;
  const sourceSheet = source.worksheets.getItem(sheetName);
  const targetSheet = workbook.worksheets.getItem(sheetName);

  // These are the editable cells in the new layout.  Formulas and formatting stay from the new template.
  targetSheet.getRange("B7").values = await sourceSheet.getRange("B7").values;
  targetSheet.getRange("B8:G9").values = await sourceSheet.getRange("B8:G9").values;
  targetSheet.getRange("B14:L55").values = await sourceSheet.getRange("B14:L55").values;
}

await fs.mkdir(path.dirname(outputPath), { recursive: true });
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);

const plannerCheck = await workbook.inspect({
  kind: "table",
  range: "Pack Planner!A6:I30",
  include: "values,formulas",
  tableMaxRows: 30,
  tableMaxCols: 9,
});
await fs.writeFile(`${outputPath}.planner.inspect.ndjson`, plannerCheck.ndjson);
const clubCheck = await workbook.inspect({
  kind: "table",
  range: "Club 10!A3:L45",
  include: "values,formulas",
  tableMaxRows: 43,
  tableMaxCols: 12,
});
await fs.writeFile(`${outputPath}.club-10.inspect.ndjson`, clubCheck.ndjson);
const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "final formula error scan",
});
await fs.writeFile(`${outputPath}.errors.ndjson`, errors.ndjson);
const plannerPreview = await workbook.render({ sheetName: "Pack Planner", range: "A1:I30", scale: 1, format: "png" });
await fs.writeFile(`${outputPath}.planner.preview.png`, new Uint8Array(await plannerPreview.arrayBuffer()));
const clubPreview = await workbook.render({ sheetName: "Club 10", range: "A1:L45", scale: 1, format: "png" });
await fs.writeFile(`${outputPath}.club-10.preview.png`, new Uint8Array(await clubPreview.arrayBuffer()));
console.log(`Created ${outputPath}`);
