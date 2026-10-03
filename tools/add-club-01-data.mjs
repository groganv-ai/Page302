import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const workbookPath = path.resolve("outputs", "game-pack-003", "Page302_GamePack003_Data_Collection.xlsx");
const fbrefUrl = "https://fbref.com/en/squads/822bd0ba/1995-1996/Liverpool-Stats";
const players = [
  ["James", "eng ENG", "GK", 24, 38, 38, 3420, 38.0, 0, 1, 1],
  ["Steve McManaman", "eng ENG", "MF", 23, 38, 38, 3408, 37.9, 6, 15, 21],
  ["Robbie Fowler", "eng ENG", "FW", 20, 38, 36, 3274, 36.4, 28, 5, 33],
  ["John Barnes", "eng ENG", "DF,FW", 31, 36, 36, 3173, 35.3, 3, 10, 13],
  ["Rob Jones", "eng ENG", "DF", 23, 33, 33, 2868, 31.9, 0, 2, 2],
  ["Stan Collymore", "eng ENG", "FW", 24, 31, 30, 2567, 28.5, 14, 11, 25],
  ["Phil Babb", "ie IRL", "DF", 24, 28, 28, 2502, 27.8, 0, 0, 0],
  ["Mark Wright", "eng ENG", "DF", 31, 28, 28, 2416, 26.8, 2, 1, 3],
  ["Jason McAteer", "ie IRL", "MF", 24, 29, 27, 2445, 27.2, 0, 3, 3],
  ["John Scales", "eng ENG", "DF", 29, 27, 27, 2404, 26.7, 0, 0, 0],
  ["Steve Harkness", "eng ENG", "DF", 23, 24, 23, 2030, 22.6, 1, 0, 1],
  ["Jamie Redknapp", "eng ENG", "MF", 22, 23, 19, 1757, 19.5, 3, 3, 6],
  ["Michael Thomas", "eng ENG", "MF", 27, 27, 18, 1748, 19.4, 1, 1, 2],
  ["Neil Ruddock", "eng ENG", "DF", 27, 20, 18, 1681, 18.7, 5, 0, 5],
  ["Ian Rush", "wls WAL", "FW", 33, 20, 10, 1025, 11.4, 5, 2, 7],
  ["Dominic Matteo", "sct SCO", "DF,MF", 21, 5, 5, 421, 4.7, 0, 0, 0],
  ["Stig Inge Bjørnebye", "no NOR", "DF", 25, 2, 2, 180, 2.0, 0, 0, 0],
  ["Mark Kennedy", "ie IRL", "DF,MF", 19, 4, 1, 183, 2.0, 0, 0, 0],
  ["Nigel Clough", "eng ENG", "FW,MF", 29, 2, 1, 115, 1.3, 0, 0, 0],
];

const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(workbookPath));
const sheet = workbook.worksheets.getItem("Club 01");
sheet.getRange("B7").values = [[fbrefUrl]];
sheet.getRange("B14:L55").clear({ applyTo: "contents" });
sheet.getRange(`B14:L${13 + players.length}`).values = players;
sheet.getRange(`E14:L${13 + players.length}`).format.numberFormat = "0.0";
sheet.getRange(`E14:H${13 + players.length}`).format.numberFormat = "#,##0";
sheet.getRange(`I14:I${13 + players.length}`).format.numberFormat = "0.0";
sheet.getRange(`J14:L${13 + players.length}`).format.numberFormat = "#,##0";

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(workbookPath);
const check = await workbook.inspect({
  kind: "table",
  range: "Club 01!A3:L33",
  include: "values,formulas",
  tableMaxRows: 22,
  tableMaxCols: 12,
});
await fs.writeFile(`${workbookPath}.club-01-data.inspect.ndjson`, check.ndjson);
const preview = await workbook.render({ sheetName: "Club 01", range: "A1:L35", scale: 1, format: "png" });
await fs.writeFile(`${workbookPath}.club-01-data.preview.png`, new Uint8Array(await preview.arrayBuffer()));
console.log(`Added ${players.length} Liverpool players to Club 01.`);
