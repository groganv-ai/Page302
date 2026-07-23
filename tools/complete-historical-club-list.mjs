import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const sourceWorkbook = process.argv[2] ?? "C:/Users/vince/Downloads/Historical Premier League Club list.xlsx";
const outputWorkbook = process.argv[3] ?? path.resolve(
  "outputs",
  "historical-club-list",
  "Historical Premier League Club list - completed.xlsx",
);
const tempDirectory = os.tmpdir();
const standingsPath = path.join(tempDirectory, "englishfootball-standings.csv");
const recentPaths = [
  { startYear: 2024, path: path.join(tempDirectory, "epl-2425.csv") },
  { startYear: 2025, path: path.join(tempDirectory, "epl-2526.csv") },
];

const canonicalNames = new Map([
  ["Arsenal", "Arsenal"], ["Aston Villa", "Aston Villa"], ["Birmingham City", "Birmingham City"],
  ["Blackburn", "Blackburn Rovers"], ["Blackburn Rovers", "Blackburn Rovers"], ["Blackpool", "Blackpool"],
  ["Bolton", "Bolton Wanderers"], ["Bolton Wanderers", "Bolton Wanderers"], ["Bournemouth", "Bournemouth"],
  ["Bradford City", "Bradford City"], ["Brentford", "Brentford"], ["Brighton", "Brighton & Hove Albion"],
  ["Brighton & Hove Albion", "Brighton & Hove Albion"], ["Burnley", "Burnley"], ["Cardiff", "Cardiff City"],
  ["Cardiff City", "Cardiff City"], ["Charlton Athletic", "Charlton Athletic"], ["Chelsea", "Chelsea"],
  ["Coventry City", "Coventry City"], ["Crystal Palace", "Crystal Palace"], ["Derby County", "Derby County"],
  ["Everton", "Everton"], ["Fulham", "Fulham"], ["Huddersfield Town", "Huddersfield Town"], ["Hull", "Hull City"],
  ["Hull City", "Hull City"], ["Ipswich", "Ipswich Town"], ["Ipswich Town", "Ipswich Town"], ["Leeds", "Leeds United"],
  ["Leeds United", "Leeds United"], ["Leicester", "Leicester City"], ["Leicester City", "Leicester City"],
  ["Liverpool", "Liverpool"], ["Luton Town", "Luton Town"], ["Man City", "Manchester City"], ["Manchester City", "Manchester City"],
  ["Man United", "Manchester United"],
  ["Manchester Utd", "Manchester United"], ["Manchester United", "Manchester United"],
  ["Middlesbrough", "Middlesbrough"], ["Newcastle", "Newcastle United"], ["Newcastle United", "Newcastle United"],
  ["Norwich City", "Norwich City"], ["Nottingham", "Nottingham Forest"], ["Nottingham Forest", "Nottingham Forest"],
  ["Nott'm Forest", "Nottingham Forest"], ["Portsmouth", "Portsmouth"], ["QPR", "Queens Park Rangers"],
  ["Queens Park Rangers", "Queens Park Rangers"], ["Reading", "Reading"], ["Sheffield Utd", "Sheffield United"],
  ["Sheffield United", "Sheffield United"], ["Sheffield Weds", "Sheffield Wednesday"],
  ["Sheffield Wednesday", "Sheffield Wednesday"], ["Southampton", "Southampton"], ["Stoke City", "Stoke City"],
  ["Sunderland", "Sunderland"], ["Swansea City", "Swansea City"], ["Tottenham", "Tottenham Hotspur"],
  ["Tottenham Hotspur", "Tottenham Hotspur"], ["Watford", "Watford"], ["West Brom", "West Bromwich Albion"],
  ["West Bromwich Albion", "West Bromwich Albion"], ["West Ham", "West Ham United"],
  ["West Ham United", "West Ham United"], ["Wigan Athletic", "Wigan Athletic"], ["Wimbledon", "Wimbledon"],
  ["Wolves", "Wolverhampton Wanderers"], ["Wolverhampton Wanderers", "Wolverhampton Wanderers"],
]);
const skySix = new Set(["Arsenal", "Chelsea", "Liverpool", "Manchester City", "Manchester United", "Tottenham Hotspur"]);
const clubMetadata = new Map([
  ["Arsenal", ["ARS", "Arsenal"]], ["Aston Villa", ["AVL", "Aston Villa"]], ["Barnsley", ["BAR", "Barnsley"]],
  ["Birmingham City", ["BIR", "Birmingham"]], ["Blackburn Rovers", ["BLA", "Blackburn"]], ["Blackpool", ["BLP", "Blackpool"]],
  ["Bolton Wanderers", ["BOL", "Bolton"]], ["Bournemouth", ["BOU", "Bournemouth"]], ["Bradford City", ["BRA", "Bradford"]],
  ["Brentford", ["BRE", "Brentford"]], ["Brighton & Hove Albion", ["BRI", "Brighton"]], ["Burnley", ["BUR", "Burnley"]],
  ["Cardiff City", ["CAR", "Cardiff"]], ["Charlton Athletic", ["CHA", "Charlton"]], ["Chelsea", ["CHE", "Chelsea"]],
  ["Coventry City", ["COV", "Coventry"]], ["Crystal Palace", ["CRY", "Crystal Palace"]], ["Derby County", ["DER", "Derby"]],
  ["Everton", ["EVE", "Everton"]], ["Fulham", ["FUL", "Fulham"]], ["Huddersfield Town", ["HUD", "Huddersfield"]],
  ["Hull City", ["HUL", "Hull"]], ["Ipswich Town", ["IPS", "Ipswich"]], ["Leeds United", ["LEE", "Leeds"]],
  ["Leicester City", ["LEI", "Leicester"]], ["Liverpool", ["LIV", "Liverpool"]], ["Luton Town", ["LUT", "Luton"]],
  ["Manchester City", ["MCI", "Man City"]], ["Manchester United", ["MUN", "Man Utd"]], ["Middlesbrough", ["MID", "Middlesbrough"]],
  ["Newcastle United", ["NEW", "Newcastle"]], ["Norwich City", ["NOR", "Norwich"]], ["Nottingham Forest", ["NFO", "Nott'm Forest"]],
  ["Oldham Athletic", ["OLD", "Oldham"]], ["Portsmouth", ["POR", "Portsmouth"]], ["Queens Park Rangers", ["QPR", "QPR"]],
  ["Reading", ["REA", "Reading"]], ["Sheffield United", ["SHU", "Sheff Utd"]], ["Sheffield Wednesday", ["SHW", "Sheff Weds"]],
  ["Southampton", ["SOU", "Southampton"]], ["Stoke City", ["STK", "Stoke"]], ["Sunderland", ["SUN", "Sunderland"]],
  ["Swansea City", ["SWA", "Swansea"]], ["Swindon Town", ["SWI", "Swindon"]], ["Tottenham Hotspur", ["TOT", "Tottenham"]],
  ["Watford", ["WAT", "Watford"]], ["West Bromwich Albion", ["WBA", "West Brom"]], ["West Ham United", ["WHU", "West Ham"]],
  ["Wigan Athletic", ["WIG", "Wigan"]], ["Wimbledon", ["WIM", "Wimbledon"]], ["Wolverhampton Wanderers", ["WOL", "Wolves"]],
]);

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const character = text[i];
    if (character === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[i + 1] === "\n") i += 1;
      row.push(cell);
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const [headers, ...values] = rows;
  return values.map((valuesRow) => Object.fromEntries(headers.map((header, index) => [header, valuesRow[index] ?? ""])));
}

function seasonLabel(startYear) {
  return `${String(startYear).slice(-2)}-${String(startYear + 1).slice(-2)}`;
}

function era(startYear) {
  if (startYear <= 1999) return "1990s (1992-99)";
  if (startYear <= 2004) return "Early 2000s (2000-04)";
  if (startYear <= 2009) return "Late 2000s (2005-09)";
  if (startYear <= 2014) return "Early 2010s (2010-14)";
  if (startYear <= 2019) return "Late 2010s (2015-19)";
  return "Modern era (2020+)";
}

function canonicalName(name) {
  return canonicalNames.get(name) ?? name;
}

function clubDetails(name) {
  const details = clubMetadata.get(name);
  if (!details) throw new Error(`Missing short code or display name for ${name}.`);
  return details;
}

function numeric(value) {
  if (value === "" || value === null || value === undefined) return null;
  return Number(value);
}

function makeStandingRow(row) {
  const played = numeric(row.played);
  return [
    numeric(row.position),
    canonicalName(row.team_name),
    played,
    numeric(row.wins),
    numeric(row.draws),
    numeric(row.losses),
    numeric(row.goals_for),
    numeric(row.goals_against),
    numeric(row.goal_difference),
    numeric(row.points),
    played ? Math.round((numeric(row.points) / played) * 100) / 100 : null,
    null,
  ];
}

function recentStandings(rows) {
  const table = new Map();
  for (const row of rows) {
    const home = row.HomeTeam;
    const away = row.AwayTeam;
    const homeGoals = numeric(row.FTHG);
    const awayGoals = numeric(row.FTAG);
    if (!home || !away || homeGoals === null || awayGoals === null) continue;
    for (const team of [home, away]) {
      if (!table.has(team)) table.set(team, { team, played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, points: 0 });
    }
    const homeStats = table.get(home);
    const awayStats = table.get(away);
    homeStats.played += 1; awayStats.played += 1;
    homeStats.gf += homeGoals; homeStats.ga += awayGoals;
    awayStats.gf += awayGoals; awayStats.ga += homeGoals;
    if (homeGoals > awayGoals) { homeStats.wins += 1; awayStats.losses += 1; homeStats.points += 3; }
    else if (homeGoals < awayGoals) { awayStats.wins += 1; homeStats.losses += 1; awayStats.points += 3; }
    else { homeStats.draws += 1; awayStats.draws += 1; homeStats.points += 1; awayStats.points += 1; }
  }
  return [...table.values()]
    .sort((a, b) => b.points - a.points || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf || a.team.localeCompare(b.team))
    .map((team, index) => [
      index + 1, canonicalName(team.team), team.played, team.wins, team.draws, team.losses,
      team.gf, team.ga, team.gf - team.ga, team.points, Math.round((team.points / team.played) * 100) / 100, null,
    ]);
}

const historicRows = parseCsv(await fs.readFile(standingsPath, "utf8"));
const dataBySeason = new Map();
for (const row of historicRows) {
  if (row.division !== "Premier League") continue;
  const startYear = Number(row.season);
  if (startYear < 2004 || startYear > 2023) continue;
  if (!dataBySeason.has(startYear)) dataBySeason.set(startYear, []);
  dataBySeason.get(startYear).push(makeStandingRow(row));
}
for (const { startYear, path: recentPath } of recentPaths) {
  dataBySeason.set(startYear, recentStandings(parseCsv(await fs.readFile(recentPath, "utf8"))));
}

const input = await FileBlob.load(sourceWorkbook);
const workbook = await SpreadsheetFile.importXlsx(input);
const allTeams = workbook.worksheets.getItem("All Teams");
const templateSheet = workbook.worksheets.getItem("03-04");

for (let startYear = 2004; startYear <= 2025; startYear += 1) {
  const name = seasonLabel(startYear);
  const standings = dataBySeason.get(startYear);
  if (!standings || standings.length !== 20) throw new Error(`Missing or incomplete data for ${name}.`);
  let sheet;
  try {
    sheet = workbook.worksheets.getItem(name);
  } catch {
    sheet = workbook.worksheets.add(name);
  }
  templateSheet.getRange("A1:L21").copyTo(sheet.getRange("A1:L21"), "all");
  sheet.getRange("A1:L21").values = [["Rk", "Squad", "MP", "W", "D", "L", "GF", "GA", "GD", "Pts", "Pts/MP", "Attendance"], ...standings];
}

const allTeamsRows = [[
  "Season", "Season code", "Rank", "Club", "Canonical club", "Short code", "Display name", "MP", "W", "D", "L", "GF", "GA", "GD", "Pts", "Pts/MP", "Era", "Sky 6", "Source", "Pack use",
]];
for (let startYear = 1992; startYear <= 2025; startYear += 1) {
  const sheet = workbook.worksheets.getItem(seasonLabel(startYear));
  const values = sheet.getRange("A2:L23").values;
  for (const row of values) {
    if (!row[1]) continue;
    const club = canonicalName(String(row[1]));
    const [shortCode, displayName] = clubDetails(club);
    allTeamsRows.push([
      `${startYear}-${String(startYear + 1).slice(-2)}`,
      `${String(startYear).slice(-2)}${String(startYear + 1).slice(-2)}`,
      row[0], String(row[1]), club, shortCode, displayName, row[2], row[3], row[4], row[5], row[6], row[7], row[8], row[9], row[10],
      era(startYear), skySix.has(club) ? "Yes" : "No",
      startYear <= 2003 ? "Existing workbook" : startYear <= 2023 ? "Fjelstul English Football Database" : "Football-Data.co.uk match results (calculated table)",
      "",
    ]);
  }
}

allTeams.getRange("A1:T800").clear({ applyTo: "all" });
allTeams.getRange(`A1:T${allTeamsRows.length}`).values = allTeamsRows;
allTeams.getRange("A1:T1").format = {
  fill: "#1F4E78",
  font: { bold: true, color: "#FFFFFF" },
  horizontalAlignment: "center",
  wrapText: true,
  borders: { preset: "all", style: "thin", color: "#B7C9D6" },
};
allTeams.getRange(`A2:T${allTeamsRows.length}`).format.borders = { preset: "inside", style: "thin", color: "#D9E2F3" };
allTeams.getRange(`H2:P${allTeamsRows.length}`).format.horizontalAlignment = "right";
allTeams.getRange(`A2:G${allTeamsRows.length}`).format.wrapText = false;
allTeams.getRange("A:A").format.columnWidth = 13;
allTeams.getRange("B:B").format.columnWidth = 13;
allTeams.getRange("C:C").format.columnWidth = 8;
allTeams.getRange("D:E").format.columnWidth = 24;
allTeams.getRange("F:G").format.columnWidth = 16;
allTeams.getRange("H:P").format.columnWidth = 10;
allTeams.getRange("Q:Q").format.columnWidth = 24;
allTeams.getRange("R:R").format.columnWidth = 10;
allTeams.getRange("S:S").format.columnWidth = 42;
allTeams.getRange("T:T").format.columnWidth = 15;
allTeams.freezePanes.freezeRows(1);

let sourceNotes;
try {
  sourceNotes = workbook.worksheets.getItem("Source Notes");
  sourceNotes.getRange("A1:B10").clear({ applyTo: "all" });
} catch {
  sourceNotes = workbook.worksheets.add("Source Notes");
}
sourceNotes.getRange("A1:B7").values = [
  ["Historical Premier League Club List — Sources", ""],
  ["1992-93 to 2003-04", "Original workbook entries supplied by Vincent Grogan."],
  ["2004-05 to 2023-24", "Fjelstul English Football Database v1.1.0 (CC-BY-SA 4.0): https://github.com/jfjelstul/englishfootball"],
  ["2024-25 and 2025-26", "Football-Data.co.uk Premier League match results; standings calculated from completed matches."],
  ["Purpose", "Club-season catalogue for PAGE302 pack selection. Attendance is intentionally blank for newly added seasons because it is not needed for the picker."],
  ["Club naming", "The All Teams sheet includes canonical club names, a unique three-character short code, and a mobile-friendly display name for consistent filtering and game presentation."],
  ["Pack categories", "Current-Premier-League status must be set when designing a pack and should not retroactively change."],
];
sourceNotes.getRange("A1:B1").merge();
sourceNotes.getRange("A1").format = { fill: "#0B1F3A", font: { bold: true, color: "#FFFFFF", size: 14 } };
sourceNotes.getRange("A2:A7").format = { fill: "#D9EAF7", font: { bold: true }, wrapText: true };
sourceNotes.getRange("A2:B7").format.borders = { preset: "all", style: "thin", color: "#B7C9D6" };
sourceNotes.getRange("A:A").format.columnWidth = 28;
sourceNotes.getRange("B:B").format.columnWidth = 100;
sourceNotes.getRange("A2:B7").format.wrapText = true;
sourceNotes.showGridLines = false;

await fs.mkdir(path.dirname(outputWorkbook), { recursive: true });
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputWorkbook);
const preview = await workbook.render({ sheetName: "All Teams", range: "A1:T24", scale: 1, format: "png" });
await fs.writeFile(`${outputWorkbook}.preview.png`, new Uint8Array(await preview.arrayBuffer()));
console.log(`Created ${outputWorkbook}`);
