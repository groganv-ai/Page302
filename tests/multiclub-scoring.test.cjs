const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const scriptPath = path.join(root, "script.js");
const browserStartup = /document\s*\.getElementById\("answer"\)\s*\.addEventListener[\s\S]*$/;
const source = fs.readFileSync(scriptPath, "utf8").replace(browserStartup, "");
const context = vm.createContext({ console });

vm.runInContext(source, context, { filename: scriptPath });

function setClubPool(clubs) {
    context.testClubs = clubs;
    vm.runInContext("clubPool = testClubs", context);
}

const game001 = JSON.parse(
    fs.readFileSync(path.join(root, "data", "vggfax001.json"), "utf8")
);

setClubPool(game001.clubs);

const keaneRecords = context.findLinkedRecords("Roy Keane", false);
assert.equal(keaneRecords.length, 2);
assert.deepEqual(
    Array.from(keaneRecords, ({ clubCode }) => clubCode),
    ["MUN", "NFO"]
);
assert.equal(
    context.calculateMultiClubPlayerScore(
        context.getRarity(keaneRecords[0].record),
        1,
        keaneRecords.length
    ),
    520
);
assert.equal(context.findLinkedRecords("Roy Keane", true).length, 0);

const syntheticClubs = [
    {
        clubCode: "AAA0001",
        squad: [{
            fullname: "Alex Example",
            surname: "Example",
            positions: ["MAN"],
            appearances: 1
        }]
    },
    {
        clubCode: "BBB0001",
        squad: [{
            fullname: "Alex Example",
            surname: "Example",
            positions: ["MAN"],
            appearances: 30
        }]
    },
    {
        clubCode: "CCC0001",
        squad: [{
            fullname: "Alex Example",
            surname: "Example",
            positions: ["DF"],
            appearances: 1
        }]
    }
];

setClubPool(syntheticClubs);

const linkedManagers = context.findLinkedRecords("Alex Example", true);
assert.equal(linkedManagers.length, 2);
assert.equal(context.findLinkedRecords("Alex Example", false).length, 1);
assert.equal(context.calculateMultiManagerScore(linkedManagers), 240);

console.log("Multi-club and multi-manager scoring tests passed.");
