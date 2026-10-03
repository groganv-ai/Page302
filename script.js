let currentGame = {

    totalGuesses: 0,

    formation: "4-4-2",

    score: 0,

    gameOver: false

};

const SUPPORTED_FORMATIONS = [

    "4-4-2",

    "4-3-3",

    "5-4-1",

    "4-5-1"

];

// Backward compatibility for older bare-array pack files.
const legacyGameFormations = {

    "001": "4-4-2",

    "002": "4-3-3",

    "003": "5-4-1"

};

let squad = [

    "GK  --------",
    "DF  --------",
    "DF  --------",
    "DF  --------",
    "DF  --------",
    "MD  --------",
    "MD  --------",
    "MD  --------",
    "MD  --------",
    "AT  --------",
    "AT  --------",
    "MAN  --------"

];
let clubData;

let clubPool = [];

let packData;

let lastPlayer = null;

let lastRarity = null;

let lastSquadIndex = -1;

let lastClubCode = null;

let squadDisplay = {};

let clubUsage = {};

let usedPeople = new Set();
let pendingAnswer = null;

let gameComplete = false;

let currentVggfax = "003";

// Update this one value whenever a new code version is created.
const APP_BUILD = "v3.7.10_003";

const FALLBACK_VGGFAX = [

    "001",

    "002",

    "003"

];

let vggfax = FALLBACK_VGGFAX.slice();

const vggfaxPackCache = new Map();

function updateVggfaxHeader() {

    document.getElementById("vggfaxNumber").textContent =
        "VGGFAX " + currentVggfax;

}

function normalizePosition(position) {

    return position == "MN" ? "MAN" : position;

}

function displayPosition(position) {

    return position == "MAN" ? "MN" : position;

}

function applyGameFormation() {

    if (!SUPPORTED_FORMATIONS.includes(currentGame.formation)) {
        throw new Error("VGGFAX " + currentVggfax + " has an invalid formation.");
    }

}

function updateBuildLabels() {

    document.getElementById("buildLabel").textContent =
        "DEMO BUILD " + APP_BUILD;

    document.getElementById("mobileBuildLabel").textContent =
        " BUILD " + APP_BUILD;

}

function nextVggfax() {

    let index = vggfax.indexOf(currentVggfax);

    index++;

    if (index >= vggfax.length) {

        index = 0;

    }

    currentVggfax = vggfax[index];

}

async function loadClub() {
    clearPendingAnswer();

    const packNumber = currentVggfax;

    const loadedPack = await loadPack(packNumber);

    packData = loadedPack.packData;
    clubPool = loadedPack.clubs;
    currentGame.formation = loadedPack.formation;

    clubData =

        clubPool[

            Math.floor(

                Math.random() *

                clubPool.length

            )

        ];

}

async function loadPack(packNumber) {

    if (!vggfaxPackCache.has(packNumber)) {

        const packRequest = fetch(
            "data/vggfax" + packNumber + ".json"
        )
        .then(function(response) {

            if (!response.ok) {
                throw new Error("Unable to load VGGFAX " + packNumber);
            }

            return response.json();

        })
        .then(function(loadedPackData) {

            let clubs;
            let formation;

            if (Array.isArray(loadedPackData)) {

                clubs = loadedPackData;
                formation = legacyGameFormations[packNumber];

            }
            else {

                if (loadedPackData.packNumber !== packNumber) {
                    throw new Error("VGGFAX " + packNumber + " has the wrong pack number.");
                }

                clubs = loadedPackData.clubs;
                formation = loadedPackData.formation;

            }

            if (!Array.isArray(clubs) || clubs.length !== 11) {
                throw new Error("VGGFAX " + packNumber + " must contain 11 clubs.");
            }

            if (!SUPPORTED_FORMATIONS.includes(formation)) {
                throw new Error("VGGFAX " + packNumber + " has an invalid formation.");
            }

            return {
                packData: loadedPackData,
                clubs: clubs,
                formation: formation
            };

        });

        vggfaxPackCache.set(packNumber, packRequest);

    }

    try {

        return await vggfaxPackCache.get(packNumber);

    }
    catch (error) {

        vggfaxPackCache.delete(packNumber);
        throw error;

    }

}

async function loadPackManifest() {

    try {

        const response = await fetch(
            "data/vggfax-manifest.json",
            { cache: "no-store" }
        );

        if (!response.ok) {
            throw new Error("Pack manifest is unavailable.");
        }

        const manifest = await response.json();

        if (!Array.isArray(manifest.packs)) {
            throw new Error("Pack manifest has no packs array.");
        }

        const manifestPacks = Array.from(
            new Set(
                manifest.packs
                .map(function(packNumber) {
                    return String(packNumber).padStart(3, "0");
                })
                .filter(function(packNumber) {
                    return /^\d+$/.test(packNumber);
                })
            )
        );

        if (manifestPacks.length == 0) {
            throw new Error("Pack manifest is empty.");
        }

        return manifestPacks;

    }
    catch (error) {

        console.warn(error.message + " Using the fallback pack list.");
        return FALLBACK_VGGFAX.slice();

    }

}

async function selectLatestValidPack() {

    const manifestPacks = await loadPackManifest();
    const sortedPacks = manifestPacks.sort(function(a, b) {
        return Number(a) - Number(b);
    });
    const validPacks = [];

    for (let i = 0; i < sortedPacks.length; i++) {

        try {

            await loadPack(sortedPacks[i]);
            validPacks.push(sortedPacks[i]);

        }
        catch (error) {

            console.warn(error.message + " Skipping this pack.");

        }

    }

    if (validPacks.length == 0) {
        throw new Error("No valid VGGFAX game packs are available.");
    }

    vggfax = validPacks;
    currentVggfax = vggfax[vggfax.length - 1];

    await loadClub();

}
async function newGame() {
    if (typeof resetScoreSubmission === "function") resetScoreSubmission();
    clearPendingAnswer();

    nextVggfax();

    updateVggfaxHeader();

    currentGame.totalGuesses = 0;

    currentGame.score = 0;

    currentGame.gameOver = false;

    lastPlayer = null;

    lastRarity = null;

    lastSquadIndex = -1;

    lastClubCode = null;

    squadDisplay = {};

    clubUsage = {};

    usedPeople = new Set();

    squad = [];

    document.getElementById(
        "answer"
    ).disabled = false;

    await loadClub();

    applyGameFormation();

    document.getElementById(
        "answer"
    ).value = "";

    setStatus(

        "ENTER ANSWER AS" +

        "\n\nPOS SURNAME CLUB" +

        "\n\ne.g. AT PLANK GER"

    );

    buildSquad();

    drawGame();

    alert("New game started!");

}

function getClubSquare(tier) {

    switch (tier) {

        case 1:
            return "<span class='shareSquare ceefaxMagenta'></span>";

        case 2:
            return "<span class='shareSquare ceefaxCyan'></span>";

        case 3:
            return "<span class='shareSquare ceefaxGreen'></span>";

        case 4:
            return "<span class='shareSquare ceefaxYellow'></span>";

        default:
            return "<span class='shareSquare ceefaxWhite'></span>";

    }

}

function getRaritySquare(rarity) {

    switch (rarity) {

        case "UNI":
            return "<span class='shareSquare ceefaxMagenta'></span>";

        case "SUB":
            return "<span class='shareSquare ceefaxCyan'></span>";

        case "UTL":
            return "<span class='shareSquare ceefaxGreen'></span>";

        case "ENG":
            return "<span class='shareSquare ceefaxYellow'></span>";

        default:
            return "<span class='shareSquare ceefaxWhite'></span>";

    }

}
function getClubEmoji(tier){

    switch(tier){

        case 1: return "🟪";

        case 2: return "🟦";

        case 3: return "🟩";

        case 4: return "🟨";

        default: return "⬜";

    }

}

function getRarityEmoji(rarity){

    switch(rarity){

        case "UNI": return "🟪";

        case "SUB": return "🟦";

        case "UTL": return "🟩";

        case "ENG": return "🟨";

        default: return "⬜";

    }

}

function buildCompleteGrid() {

    let html = "";

    for (

        let i = 0;

        i < squad.length;

        i++

    ) {

        if (

            squad[i] == ""

        ) {

            continue;

        }

        let position =

            displayPosition(
                squad[i].split(" ")[0]
            );

        let clubSquare =

            "";

        let raritySquare =

            "";

        if (

            squadDisplay[i]

        ) {

            if (!squadDisplay[i].isManager) {

                clubSquare =

                    getClubSquare(

                        squadDisplay[i].clubTier

                    );

            }

            raritySquare =

                getRaritySquare(

                    squadDisplay[i].rarity

                );

        }

        html +=

            "<div class='completeRow'>" +

            "<span class='completePosition'>" +

            position +

            "</span>" +

            clubSquare +

            raritySquare + (squadDisplay[i] && squadDisplay[i].clubs.length > 1 ? "<span class='completeMultiple'>×" + squadDisplay[i].clubs.length + "</span>" : "<span class='completeMultiple'></span>") +

            "</div>";

    }

    document.getElementById(

        "completeGrid"

    ).innerHTML = html;

}

function completeGame() {

    if (typeof prepareScoreSubmission === "function") prepareScoreSubmission();

    gameComplete = true;

    currentGame.gameOver = true;

    document.getElementById(
        "answer"
    ).disabled = true;

    document.getElementById(
        "completeScoreValue"
    ).innerText =
    currentGame.score;

    document.getElementById(
        "completeGameNumber"
    ).innerText =
    "GAME #" + currentVggfax + " · " + currentGame.formation;

    buildCompleteGrid();

    document.getElementById(
        "gameCompleteOverlay"
    ).style.display = "flex";

}

function closeCompleteGame() {

    document.getElementById(
        "gameCompleteOverlay"
    ).style.display = "none";

}

async function shareResult() {

    let shareText =

        "PAGE302\n\n" +

        "GAME #" + currentVggfax + "\n\n" +

        "SCORE: " +

        currentGame.score +

        "\n\n" +

        "SQUAD GRID\n\n";

    for (

        let i = 0;

        i < squad.length;

        i++

    ) {

        if (

            squad[i] == ""

        ) {

            continue;

        }

        let position =

            displayPosition(
                squad[i].split(" ")[0]
            );

        let clubEmoji = squadDisplay[i].isManager
            ? ""
            : getClubEmoji(

                squadDisplay[i].clubTier

            );

        let rarityEmoji =

            getRarityEmoji(

                squadDisplay[i].rarity

            );

        shareText +=

            position +

            " " +

            clubEmoji +

            rarityEmoji + (squadDisplay[i].clubs.length > 1 ? " ×" + squadDisplay[i].clubs.length : "") +

            "\n";

    }

    shareText +=

        "\nCAN YOU BEAT MY PAGE302 SCORE?\n\n" +

        "https://groganv-ai.github.io/Page302/";

 let mobile =

    /Android|iPhone|iPad|iPod/i.test(

        navigator.userAgent

    );

if (

    mobile &&

    navigator.share

) {

    await navigator.share({

        text: shareText

    });

}

else {

    await navigator.clipboard.writeText(

        shareText

    );

    let button =

        document.getElementById(

            "shareButton"

        );

    button.innerText =

        "COPIED ✓";

    setTimeout(function(){

        button.innerText =

        "SHARE";

    },2000);

}

}

function submitAnswer() {

    if (currentGame.gameOver) {

        return;

    }

    if (pendingAnswer) {
        return;
    }

    currentGame.totalGuesses =
    currentGame.totalGuesses + 1;
    drawGuesses();

    let playerAnswer =
    document.getElementById(
    "answer"
    ).value;

    playerAnswer =
    playerAnswer.trim();

let parts =

playerAnswer
.trim()
.split(/\s+/);

if (

    parts.length < 3

) {

    setStatus(

        "FORMAT: AT PLANK GER"

    );

    return;

}

let position =

    parts[0]
    .toUpperCase();

position = normalizePosition(position);

let clubCode =

    parts[
        parts.length - 1
    ]
    .toUpperCase();

let surname =

    parts
    .slice(
        1,
        parts.length - 1
    )
    .join(" ");

    if (

        playerAnswer == ""

    ) {

        setStatus(

            "ENTER A PLAYER"

        );

        return;

    }

const matches = findPlayers(surname, position, clubCode);
if (matches.length > 1) {
    showAnswerChoices(matches, position, clubCode);
    return;
}

applyAnswer(matches[0] || null, position, clubCode, playerAnswer, surname);
}

function applyAnswer(player, position, clubCode, playerAnswer, surname, selectedName = false) {

if (

    player == null

) {

    if (

        playerExistsAtClub(

            surname,

            clubCode

        )

    ) {

        setStatus(

            surname.toUpperCase() +

            " - TRY ANOTHER POSITION"

        );

    }

    else {

        setStatus(

            playerAnswer.toUpperCase() +

            " - NOT FOUND"

        );

    }

}

else if (

    playerAlreadyUsed(
    player
    )

) {

    setStatus(

        displayPosition(position) +

        " " +

        player.surname.toUpperCase() +

        " - ALREADY USED"

    );

}

else if (

    hasFreePosition(
    position
    ) == false

) {

    setStatus(

        displayPosition(position) +

        " " +

        player.surname.toUpperCase() +

        " - POSITION FULL"

    );

}

    else {

        let isManager = position == "MAN";

        let linkedRecords = findLinkedRecords(
            player.fullname,
            isManager
        );

        let linkedClubCodes = getLinkedClubCodes(
            linkedRecords,
            clubCode
        );

        let rarity;
        let clubTier = null;
        let points;

        if (isManager) {

            rarity = getManagerRarity(player);

            points = calculateMultiManagerScore(linkedRecords);

        }
        else {

            rarity = getRarity(player);

            if (clubUsage[clubCode] == null) {
                clubUsage[clubCode] = 0;
            }

            clubUsage[clubCode]++;

            clubTier = getClubTier(clubCode);

            points = calculateMultiClubPlayerScore(
                rarity,
                clubTier,
                linkedRecords.length
            );

        }

        lastPlayer =
        player.surname;

        lastClubCode =
        clubCode;

        lastRarity =
        rarity;

        usedPeople.add(
            normalizePersonName(player.fullname)
        );

        console.log(clubUsage);

    addPlayerToSquad(
        player,
        position,
        isManager,
        linkedClubCodes,
        rarity,
        clubTier,
        points
    );

    currentGame.score =

    currentGame.score +
    points;

        refreshScreen();

if (

    squadComplete()

) {

    setStatus(

        displayPosition(position) +

        " " +

        (selectedName ? player.fullname : player.surname).toUpperCase() +
        " " + clubCode +

        " - CORRECT",
        true

    );

setTimeout(function () {

    completeGame();

}, 50);

}

else {

    setStatus(

        displayPosition(position) +

        " " +

        (selectedName ? player.fullname : player.surname).toUpperCase() +
        " " + clubCode +

        " - CORRECT",
        true

    );

}

    }

    document.getElementById(
    "answer"
    ).value = "";

    document.getElementById("answer").focus();

document.getElementById("answer").select();

}

function clearPendingAnswer() {
    pendingAnswer = null;
    const choices = document.getElementById("answerChoices");
    choices.replaceChildren();
    choices.hidden = true;
    document.getElementById("result").classList.remove("selectionPrompt");
}

function showAnswerChoices(matches, position, clubCode) {
    setStatus("DID YOU MEAN?");
    document.getElementById("result").classList.add("selectionPrompt");
    const request = { matches, position, clubCode };
    pendingAnswer = request;
    const choices = document.getElementById("answerChoices");
    choices.hidden = false;
    const options = document.createElement("div");
    options.className = "answerOptions";

    matches.forEach(function(player) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "answerChoice";
        button.textContent = player.fullname.toUpperCase();
        button.disabled = playerAlreadyUsed(player);
        if (button.disabled) {
            const label = document.createElement("span");
            label.className = "answerAlreadyUsed";
            label.textContent = "ALREADY USED";
            button.append(label);
        }
        button.addEventListener("click", function() {
            if (pendingAnswer !== request || currentGame.gameOver) return;
            clearPendingAnswer();
            applyAnswer(player, position, clubCode, "", player.surname, true);
        });
        options.append(button);
    });

    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "answerCancel";
    cancel.textContent = "CANCEL";
    cancel.addEventListener("click", cancelAnswerChoice);
    choices.append(options, cancel);
    (options.querySelector("button:not(:disabled)") || cancel).focus();
}

function cancelAnswerChoice() {
    if (!pendingAnswer) return;
    setStatus("SELECTION CANCELLED");
    document.getElementById("answer").focus();
}

function getClubByCode(

    clubCode

) {

    for (

        let i = 0;

        i < clubPool.length;

        i++

    ) {

        let club =

            clubPool[i];

        if (

            club.clubCode
            .substring(0,3)

            ==

            clubCode

        ) {

            return club;

        }

    }

    return null;

}

function normalizePersonName(fullname) {

    return fullname
        .normalize("NFKC")
        .trim()
        .toLocaleLowerCase("en-GB");

}

function recordIsManager(record) {

    return record.positions.includes("MAN");

}

function findLinkedRecords(fullname, managersOnly) {

    let identity = normalizePersonName(fullname);
    let linkedRecords = [];

    for (let i = 0; i < clubPool.length; i++) {

        let club = clubPool[i];

        for (let j = 0; j < club.squad.length; j++) {

            let record = club.squad[j];

            if (
                normalizePersonName(record.fullname) == identity &&
                recordIsManager(record) == managersOnly
            ) {

                linkedRecords.push({
                    clubCode: club.clubCode.substring(0, 3),
                    record: record
                });

                break;

            }

        }

    }

    return linkedRecords;

}

function getLinkedClubCodes(linkedRecords, submittedClubCode) {

    let clubCodes = linkedRecords.map(function(linkedRecord) {
        return linkedRecord.clubCode;
    });

    return [submittedClubCode].concat(
        clubCodes.filter(function(clubCode) {
            return clubCode != submittedClubCode;
        })
    );

}

function playerAlreadyUsed(player) {

    return usedPeople.has(
        normalizePersonName(player.fullname)
    );

}
function getRarity(player) {

    if (player.appearances == 1) {

        return {
            label: "UNICORN",
            short: "UNI",
            points: 100
        };

    }

    else if (player.appearances <= 9) {

        return {
            label: "SUPER SUB",
            short: "SUB",
            points: 80
        };

    }

    else if (player.appearances <= 15) {

        return {
            label: "UTILITY",
            short: "UTL",
            points: 60
        };

    }

    else if (player.appearances <= 29) {

        return {
            label: "ENGINE ROOM",
            short: "ENG",
            points: 40
        };

    }

    else {

        return {
            label: "LEGEND",
            short: "LEG",
            points: 20
        };

    }

}

function getManagerRarity(manager) {

    return getRarity(manager);

}
function getClubTier(

    clubCode

) {

    let usage =

        clubUsage[clubCode] || 0;

    if (

        usage <= 1

    ) {

        return 1;

    }

    else if (

        usage == 2

    ) {

        return 2;

    }

    else if (

        usage == 3

    ) {

        return 3;

    }

    else if (

        usage == 4

    ) {

        return 4;

    }

    return 5;

}
function getClubMultiplier(

    clubTier

) {

    if (

        clubTier == 1

    ) {

        return 13;

    }

    else if (

        clubTier == 2

    ) {

        return 8;

    }

    else if (

        clubTier == 3

    ) {

        return 5;

    }

    else if (

        clubTier == 4

    ) {

        return 3;

    }

    return 1;

}

function calculateMultiClubPlayerScore(
    rarity,
    clubTier,
    linkedClubCount
) {

    return (
        rarity.points *
        getClubMultiplier(clubTier) *
        linkedClubCount
    );

}

function calculateMultiManagerScore(linkedRecords) {

    let linkedManagerPoints = linkedRecords.reduce(
        function(total, linkedRecord) {
            return total + getManagerRarity(
                linkedRecord.record
            ).points;
        },
        0
    );

    return linkedManagerPoints * linkedRecords.length;

}
function drawSquad() {

    let html = "";

    for (

        let i = 0;

        i < squad.length;

        i++

    ) {

        let line = squad[i].replace(/^MAN(?=\s)/, "MN");

 if (

    squadDisplay[i]

) {

    let colour = "white";

    if (

        squadDisplay[i].rarity == "UNI"

    ) {

        colour = "#ff55ff";

    }

    else if (

        squadDisplay[i].rarity == "SUB"

    ) {

        colour = "#55ffff";

    }

    else if (

        squadDisplay[i].rarity == "UTL"

    ) {

        colour = "#55ff55";

    }

    else if (

        squadDisplay[i].rarity == "ENG"

    ) {

        colour = "#ffff55";

    }

        else if (

        squadDisplay[i].rarity == "LEG"

    ) {

        colour = "#ffffff";

    }

    let clubColour = "#ffffff";

if (

    squadDisplay[i].clubTier == 1

) {

    clubColour = "#ff55ff";

}

else if (

    squadDisplay[i].clubTier == 2

) {

    clubColour = "#55ffff";

}

else if (

    squadDisplay[i].clubTier == 3

) {

    clubColour = "#55ff55";

}

else if (

    squadDisplay[i].clubTier == 4

) {

    clubColour = "#ffff55";

}

let badge;

if (squadDisplay[i].isManager) {

    badge =

        "<span style='color:#ffffff;'>" +

        squadDisplay[i].club +

        "</span>" +

        " · " +

        "<span style='color:" +

        colour +

        ";'>" +

        squadDisplay[i].rarity +

        "</span>";

}

else {

badge =

    "<span style='color:" +

    clubColour +

    ";'>" +

    squadDisplay[i].club +

    "</span>" +

    " × " +

    "<span style='color:" +

    colour +

    ";'>" +

    squadDisplay[i].rarity +

    "</span>";

}
            line =

            line +

            "  " +

            badge;

        }

        if (

            i == lastSquadIndex

        ) {

            line =

            "<strong>" +

            line +

            "</strong>";

        }

        html =

        html +

        line +

        "<br>";

    }

    document.getElementById(

        "squadBoard"

    ).innerHTML =

    html;

}

function drawFormation() {

    document.querySelector(
    "#formationDisplay .statusValue").textContent =
    currentGame.formation;

}
function buildSquad() {

    if (currentGame.formation == "4-4-2") {

        squad = [

            "GK  --------",

            "DF  --------",
            "DF  --------",
            "DF  --------",
            "DF  --------",
    
            "MD  --------",
            "MD  --------",
            "MD  --------",
            "MD  --------",

            "AT  --------",
            "AT  --------",
            "",
            "MAN  --------"

        ];

    }

    else if (currentGame.formation == "4-3-3") {

        squad = [

            "GK  --------",

            "DF  --------",
            "DF  --------",
            "DF  --------",
            "DF  --------",

            "MD  --------",
            "MD  --------",
            "MD  --------",

            "AT  --------",
            "AT  --------",
            "AT  --------",
            "",
            "MAN  --------"

        ];

    }

        else if (currentGame.formation == "5-4-1") {

        squad = [

            "GK  --------",

            "DF  --------",
            "DF  --------",
            "DF  --------",
            "DF  --------",
            "DF  --------",

            "MD  --------",
            "MD  --------",
            "MD  --------",
            "MD  --------",

            "AT  --------",
            "",
            "MAN  --------"

        ];

    }

    else if (currentGame.formation == "4-5-1") {

        squad = [

            "GK  --------",

            "DF  --------",
            "DF  --------",
            "DF  --------",
            "DF  --------",

            "MD  --------",
            "MD  --------",
            "MD  --------",
            "MD  --------",
            "MD  --------",

            "AT  --------",
            "",
            "MAN  --------"

        ];

    }

}
function drawClubTitle() {

    let html = "";

    for (

        let i = 0;

        i < clubPool.length;

        i++

    ) {

        let club =

            clubPool[i];

        let shortCode =

            club.clubCode
            .substring(0, 3);

        let usage =

            clubUsage[shortCode] == null

            ?

            0

            :

            clubUsage[shortCode];

let colour = "white";

if (

    usage == 1

) {

    colour = "#ff55ff";

}

else if (

    usage == 2

) {

    colour = "#55ffff";

}

else if (

    usage == 3

) {

    colour = "#55ff55";

}

else if (

    usage == 4

) {

    colour = "#ffff55";

}

else if (

    usage >= 5

) {

    colour = "#ffffff";

}

        let displaySeason = club.season.replace(
            /^\d{2}(\d{2}-\d{2})$/,
            "$1"
        );

        let line =

            shortCode +

            " - " +

            club.club +

            " " +

            displaySeason +

            " x" +

            usage;

        if (

            shortCode ==

            lastClubCode

        ) {

            line = line;

        }

        html +=

            "<div class='clubRow' style='color:" +

            colour +

            ";'>" +

            line +

            "</div>";

    }

    document.getElementById(
        "clubTitle"
    ).innerHTML = html;

}
function refreshScreen() {

    drawSquad();

    drawScore();

    drawGuesses();

    drawFormation();

    drawClubTitle();

}
function drawGame() {

    refreshScreen();

}
function drawScore() {

    document.getElementById(
    "scoreDisplay"
    ).innerText =

    "SCORE : " +

    currentGame.score;

}
function drawGuesses() {

    document.querySelector(
    "#guessDisplay .statusValue"
    ).textContent = currentGame.totalGuesses;

}
function setStatus(text, isCorrect = false) {
clearPendingAnswer();

const result = document.getElementById("result");
result.textContent = text;
result.classList.toggle("correctAnswer", isCorrect);

}
async function startGame() {

    updateBuildLabels();

    await selectLatestValidPack();

    updateVggfaxHeader();

    applyGameFormation();

    clubUsage = {};

    usedPeople = new Set();

    console.log(clubData);

    buildSquad();

setStatus(

    "ENTER ANSWER AS" +

    "\n\nPOS SURNAME CLUB" +

    "\n\ne.g. AT PLANK GER"

);

    drawGame();

}
function normalizeSearchName(name) {
    return name.normalize("NFD")
        .replace(/\p{M}/gu, "")
        .toUpperCase()
        .toLowerCase()
        .replace(/[\s'\u2018\u2019\u02BC\uFF07\-\u2010-\u2015]/gu, "");
}

function isOneLetterTypo(answer, surname) {
    const a = Array.from(answer);
    const b = Array.from(surname);
    if (b.length < 5 || Math.abs(a.length - b.length) > 1) return false;
    let i = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) i++;
    if (i === a.length || i === b.length) return a.length !== b.length;
    const rest = (letters, start) => letters.slice(start).join("");
    if (a.length === b.length) {
        return rest(a, i + 1) === rest(b, i + 1) ||
            (a[i] === b[i + 1] && a[i + 1] === b[i] &&
             rest(a, i + 2) === rest(b, i + 2));
    }
    return a.length > b.length
        ? rest(a, i + 1) === rest(b, i)
        : rest(a, i) === rest(b, i + 1);
}

function findPlayers(surname, position, clubCode) {
    const club = getClubByCode(clubCode);
    if (!club) return [];
    const answer = normalizeSearchName(surname);
    const exact = club.squad.filter(function(player) {
        return normalizeSearchName(player.surname) === answer;
    });
    // An exact name at the wrong position must not become a different player.
    if (exact.length) return exact.filter(player => player.positions.includes(position));
    return club.squad.filter(function(player) {
        return player.positions.includes(position) &&
            isOneLetterTypo(answer, normalizeSearchName(player.surname));
    });
}

function playerExistsAtClub(

    surname,

    clubCode

) {

    let club =

        getClubByCode(
            clubCode
        );

    if (

        club == null

    ) {

        return false;

    }

    for (

        let i = 0;

        i < club.squad.length;

        i++

    ) {

        if (

            normalizeSearchName(club.squad[i].surname)

            ==

            normalizeSearchName(surname)

        ) {

            return true;

        }

    }

    return false;

}
function hasFreePosition(position) {

    for (

        let i = 0;

        i < squad.length;

        i++

    ) {

        if (

            squad[i] ==

            position + "  --------"

        ) {

            return true;

        }

    }

    return false;

}
function addPlayerToSquad(
    player,
    selectedPosition,
    isManager,
    linkedClubCodes,
    rarity,
    clubTier,
    points
) {

    for (

        let i = 0;

        i < squad.length;

        i++

    ) {

        if (

            squad[i] ==

            selectedPosition + "  --------"

        ) {

            squad[i] =

                selectedPosition +

                "  " +

                player.surname;

            lastSquadIndex = i;

squadDisplay[i] = {

    personId: (isManager ? "manager:" : "player:") + normalizePersonName(player.fullname),
    name: player.fullname,
    position: selectedPosition,
    contributions: findLinkedRecords(player.fullname, isManager).map(function(link) {
        return {
            recordId: link.record.id,
            points: isManager
                ? getManagerRarity(link.record).points * linkedClubCodes.length
                : points / linkedClubCodes.length
        };
    }),

    score: points,

    rarity: rarity.short,

    club:
    linkedClubCodes.join("/"),

    clubs:
    linkedClubCodes,

    isManager:
    isManager,

    clubTier:
    clubTier

};

            return;

        }

    }

}
function squadComplete() {

    for (

        let i = 0;

        i < squad.length;

        i++

    ) {

        if (

            squad[i].includes(
            "--------"
            )

        ) {

            return false;

        }

    }

    return true;

}
function showHelp() {

    document
        .getElementById("helpOverlay")
        .style.display = "flex";

}

function hideHelp() {

    document
        .getElementById("helpOverlay")
        .style.display = "none";

}
function showAbout() {

    document
        .getElementById("aboutOverlay")
        .style.display = "flex";

}

function hideAbout() {

    document
        .getElementById("aboutOverlay")
        .style.display = "none";

}
document
    .getElementById("answer")
    .addEventListener(

        "keydown",

        function(event) {

            if (

                event.key === "Enter"

            ) {

                event.preventDefault();

                submitAnswer();

            }

        }

    );
document.getElementById("answer").addEventListener("input", function() {
    if (pendingAnswer) setStatus("ENTER ANSWER AS POS SURNAME CLUB");
});
document.getElementById("answerChoices").addEventListener("keydown", function(event) {
    if (event.key === "Escape") {
        event.preventDefault();
        cancelAnswerChoice();
    }
});
startGame().catch(function(error) {

    console.error(error);
    setStatus("UNABLE TO LOAD A VALID GAME PACK");
    document.getElementById("answer").disabled = true;

});

