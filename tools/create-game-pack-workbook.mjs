import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const packNumber = process.argv[2] ?? "003";
const outputPath = process.argv[3] ?? path.resolve(
  "outputs",
  "game-pack-template",
  `Page302_GamePack${packNumber}_Data_Collection.xlsx`,
);

const colours = {
  navy: "#0B1F3A",
  blue: "#1F4E78",
  green: "#2E7D32",
  paleBlue: "#D9EAF7",
  paleYellow: "#FFF2CC",
  paleGreen: "#E2F0D9",
  paleGrey: "#F2F2F2",
  border: "#B7C9D6",
  white: "#FFFFFF",
};

const eraBands = [
  "1990s (1992-99)",
  "Early 2000s (2000-04)",
  "Late 2000s (2005-09)",
  "Early 2010s (2010-14)",
  "Late 2010s (2015-19)",
  "Modern era (2020+)",
];

const slots = [
  ...Array.from({ length: 4 }, (_, index) => ({ slot: index + 1, category: "Sky 6" })),
  ...Array.from({ length: 5 }, (_, index) => ({ slot: index + 5, category: "Other current Premier League club" })),
  ...Array.from({ length: 2 }, (_, index) => ({ slot: index + 10, category: "Not currently in the Premier League" })),
];

function setTitle(sheet, range, text) {
  const title = sheet.getRange(range);
  title.merge();
  title.values = [[text]];
  title.format = {
    fill: colours.navy,
    font: { bold: true, color: colours.white, size: 16 },
    horizontalAlignment: "left",
    verticalAlignment: "center",
  };
  title.format.rowHeight = 28;
}

function setSectionHeader(sheet, range, text) {
  const header = sheet.getRange(range);
  header.merge();
  header.values = [[text]];
  header.format = {
    fill: colours.blue,
    font: { bold: true, color: colours.white },
    horizontalAlignment: "left",
  };
}

function setTableHeader(range) {
  range.format = {
    fill: colours.blue,
    font: { bold: true, color: colours.white },
    horizontalAlignment: "center",
    verticalAlignment: "center",
    wrapText: true,
    borders: { preset: "all", style: "thin", color: colours.border },
  };
}

function setInputCells(range) {
  range.format = {
    fill: colours.paleYellow,
    borders: { preset: "all", style: "thin", color: colours.border },
  };
}

const workbook = Workbook.create();
const planner = workbook.worksheets.add("Pack Planner");
planner.showGridLines = false;

setTitle(planner, "A1:I1", `PAGE302 — GAME PACK ${packNumber} PLANNER`);
planner.getRange("A3:I3").merge();
planner.getRange("A3").values = [[
  "Choose one club-season per row. Yellow cells are yours to complete. The workbook checks the required 4 / 5 / 2 mix and encourages a spread across the full Premier League era.",
]];
planner.getRange("A3").format = { fill: colours.paleBlue, wrapText: true };
planner.getRange("A3").format.rowHeight = 34;

setSectionHeader(planner, "A5:C5", "PACK STATUS");
planner.getRange("A6:C8").values = [
  ["Pack number", packNumber, null],
  ["Clubs selected", null, "Target: 11"],
  ["Pack readiness", null, "Complete all 11 rows before collecting player data."],
];
planner.getRange("B7").formulas = [["=COUNTIF(C11:C21,\"<>\")"]];
planner.getRange("B8").formulas = [["=IF(B7=11,\"READY TO COLLECT DATA\",\"IN PROGRESS\")"]];
planner.getRange("A6:C8").format.borders = { preset: "all", style: "thin", color: colours.border };
planner.getRange("A6:A8").format = { fill: colours.paleGrey, font: { bold: true } };
planner.getRange("B6:B8").format = { fill: colours.paleGreen, font: { bold: true } };

setSectionHeader(planner, "E5:I5", "COMPOSITION CHECKS");
planner.getRange("E6:I9").values = [
  ["Category", "Required", "Selected", "Result", "Rule"],
  ["Sky 6", 4, null, null, "Exactly 4"],
  ["Other current Premier League club", 5, null, null, "Exactly 5"],
  ["Not currently in the Premier League", 2, null, null, "Exactly 2"],
];
setTableHeader(planner.getRange("E6:I6"));
planner.getRange("G7").formulas = [["=COUNTIFS(B11:B21,E7,C11:C21,\"<>\")"]];
planner.getRange("G8").formulas = [["=COUNTIFS(B11:B21,E8,C11:C21,\"<>\")"]];
planner.getRange("G9").formulas = [["=COUNTIFS(B11:B21,E9,C11:C21,\"<>\")"]];
planner.getRange("H7").formulas = [["=IF(G7=F7,\"OK\",\"CHECK\")"]];
planner.getRange("H8").formulas = [["=IF(G8=F8,\"OK\",\"CHECK\")"]];
planner.getRange("H9").formulas = [["=IF(G9=F9,\"OK\",\"CHECK\")"]];
planner.getRange("E7:I9").format.borders = { preset: "all", style: "thin", color: colours.border };
planner.getRange("F7:H9").format.horizontalAlignment = "center";
planner.getRange("E7:E9").format.wrapText = true;
planner.getRange("E7:I9").format.rowHeight = 28;

planner.getRange("A10:I10").values = [[
  "Slot", "Required category", "Club", "Season", "Team code", "Era", "FBref URL (filled on club tab)", "Manager (filled on club tab)", "Row status",
]];
setTableHeader(planner.getRange("A10:I10"));
planner.getRange("A11:B21").values = slots.map((entry) => [entry.slot, entry.category]);
planner.getRange("C11:F21").values = slots.map(() => [null, null, null, null]);
planner.getRange("I11:I21").formulas = slots.map((entry, index) => {
  const row = index + 11;
  return [`=IF(AND(C${row}<>\"\",D${row}<>\"\",E${row}<>\"\",F${row}<>\"\",G${row}<>\"\",H${row}<>\"\"),\"READY\",\"NEEDS DETAILS\")`];
});
planner.getRange("A11:I21").format.borders = { preset: "all", style: "thin", color: colours.border };
planner.getRange("A11:B21").format.fill = colours.paleGrey;
planner.getRange("B11:B21").format.wrapText = true;
planner.getRange("A11:I21").format.rowHeight = 28;
setInputCells(planner.getRange("C11:F21"));
planner.getRange("G11:H21").format = { fill: colours.paleBlue, borders: { preset: "all", style: "thin", color: colours.border } };
planner.getRange("I11:I21").format = { fill: colours.paleGreen, font: { bold: true }, borders: { preset: "all", style: "thin", color: colours.border } };
planner.getRange("F11:F21").dataValidation = { rule: { type: "list", values: eraBands } };

setSectionHeader(planner, "E23:F23", "ERA COVERAGE");
planner.getRange("E24:F30").values = [["Era", "Selected"]].concat(eraBands.map((era) => [era, null]));
setTableHeader(planner.getRange("E24:F24"));
planner.getRange("F25").formulas = [["=COUNTIF($F$11:$F$21,E25)"]];
planner.getRange("F25:F30").fillDown();
planner.getRange("E25:F30").format.borders = { preset: "all", style: "thin", color: colours.border };

planner.getRange("A23:C23").merge();
planner.getRange("A23").values = [["IMPORTANT: Set the category at pack-design time. Do not change historic pack categories just because a club is promoted or relegated later."]];
planner.getRange("A23").format = { fill: colours.paleYellow, wrapText: true, font: { italic: true } };
planner.getRange("A23").format.rowHeight = 32;

planner.getRange("A:A").format.columnWidth = 13;
planner.getRange("B:B").format.columnWidth = 38;
planner.getRange("C:C").format.columnWidth = 22;
planner.getRange("D:D").format.columnWidth = 13;
planner.getRange("E:E").format.columnWidth = 20;
planner.getRange("F:F").format.columnWidth = 24;
planner.getRange("G:G").format.columnWidth = 42;
planner.getRange("H:H").format.columnWidth = 24;
planner.getRange("I:I").format.columnWidth = 18;
planner.freezePanes.freezeRows(10);

for (const [index, slot] of slots.entries()) {
  const plannerRow = index + 11;
  const sheet = workbook.worksheets.add(`Club ${String(index + 1).padStart(2, "0")}`);
  sheet.showGridLines = false;

  setTitle(sheet, "A1:L1", `PAGE302 — CLUB DATA COLLECTION — SLOT ${String(index + 1).padStart(2, "0")}`);
  sheet.getRange("A3:G9").values = [
    ["TEAM CODE:", null, null, null, null, null, null],
    ["CLUB:", null, null, null, null, null, null],
    ["SEASON:", null, null, null, null, null, null],
    ["REQUIRED CATEGORY:", null, null, null, null, null, null],
    ["FBREF URL:", null, null, null, null, null, null],
    ["MANAGER(S):", null, null, null, null, null, null],
    ["LEAGUE MATCHES MANAGED:", null, null, null, null, null, null],
  ];
  sheet.getRange("B7:L7").merge();
  sheet.getRange("B3").formulas = [[`=IF('Pack Planner'!$E$${plannerRow}=\"\",\"\",'Pack Planner'!$E$${plannerRow})`]];
  sheet.getRange("B4").formulas = [[`=IF('Pack Planner'!$C$${plannerRow}=\"\",\"\",'Pack Planner'!$C$${plannerRow})`]];
  sheet.getRange("B5").formulas = [[`=IF('Pack Planner'!$D$${plannerRow}=\"\",\"\",'Pack Planner'!$D$${plannerRow})`]];
  sheet.getRange("B6").formulas = [[`='Pack Planner'!$B$${plannerRow}`]];
  sheet.getRange("A3:G9").format.borders = { preset: "all", style: "thin", color: colours.border };
  sheet.getRange("A3:A9").format = { fill: colours.paleGrey, font: { bold: true } };
  sheet.getRange("B3:B6").format = { fill: colours.paleBlue };
  setInputCells(sheet.getRange("B7:L7"));
  setInputCells(sheet.getRange("B8:G9"));

  sheet.getRange("A11:L11").merge();
  sheet.getRange("A11").values = [["FBREF TABLE: Paste the club's Premier League standard player table below. The important fields are Player, Pos and MP (league appearances)."]];
  sheet.getRange("A11").format = { fill: colours.paleYellow, wrapText: true, font: { bold: true } };
  sheet.getRange("A11").format.rowHeight = 30;
  sheet.getRange("B12:L12").values = [[null, "Playing Time", null, null, "Performance", null, null, null, null, null, null]];
  sheet.getRange("B13:L13").values = [["Player", "Nation", "Pos", "Age", "MP", "Starts", "Min", "90s", "Gls", "Ast", "G+A"]];
  sheet.getRange("B12:L13").format = { fill: colours.blue, font: { bold: true, color: colours.white }, horizontalAlignment: "center", borders: { preset: "all", style: "thin", color: colours.border } };
  sheet.getRange("B14:L55").format = { borders: { preset: "inside", style: "thin", color: colours.border } };
  sheet.getRange("A14:A55").values = Array.from({ length: 42 }, (_, row) => [row + 1]);
  sheet.getRange("A14:A55").format = { fill: colours.paleGrey, horizontalAlignment: "center" };

  sheet.getRange("A57:L57").merge();
  sheet.getRange("A57").values = [["Position conversion for the game: GK → GK, DF → DF, MF → MD, FW → AT. Multiple FBref positions should remain multiple eligible game positions."]];
  sheet.getRange("A57").format = { fill: colours.paleBlue, wrapText: true, font: { italic: true } };
  sheet.getRange("A57").format.rowHeight = 28;
  sheet.getRange("A:A").format.columnWidth = 26;
  sheet.getRange("B:B").format.columnWidth = 26;
  sheet.getRange("C:C").format.columnWidth = 14;
  sheet.getRange("D:D").format.columnWidth = 12;
  sheet.getRange("E:L").format.columnWidth = 10;
  sheet.freezePanes.freezeRows(13);

  planner.getRange(`G${plannerRow}`).formulas = [[`=IF('${sheet.name}'!$B$7=\"\",\"\",'${sheet.name}'!$B$7)`]];
  planner.getRange(`H${plannerRow}`).formulas = [[
    `=IF('${sheet.name}'!$B$8=\"\",\"\",'${sheet.name}'!$B$8)&IF('${sheet.name}'!$C$8=\"\",\"\",\", \"&'${sheet.name}'!$C$8)&IF('${sheet.name}'!$D$8=\"\",\"\",\", \"&'${sheet.name}'!$D$8)&IF('${sheet.name}'!$E$8=\"\",\"\",\", \"&'${sheet.name}'!$E$8)&IF('${sheet.name}'!$F$8=\"\",\"\",\", \"&'${sheet.name}'!$F$8)&IF('${sheet.name}'!$G$8=\"\",\"\",\", \"&'${sheet.name}'!$G$8)`,
  ]];
}

await fs.mkdir(path.dirname(outputPath), { recursive: true });
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
const preview = await workbook.render({
  sheetName: "Pack Planner",
  range: "A1:I30",
  scale: 1,
  format: "png",
});
await fs.writeFile(`${outputPath}.preview.png`, new Uint8Array(await preview.arrayBuffer()));
const clubPreview = await workbook.render({
  sheetName: "Club 01",
  range: "A1:L20",
  scale: 1,
  format: "png",
});
await fs.writeFile(`${outputPath}.club-preview.png`, new Uint8Array(await clubPreview.arrayBuffer()));
console.log(`Created ${outputPath}`);
