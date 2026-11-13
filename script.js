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

let currentVggfax = "002";

// Update this one value whenever a new code version is created.
const APP_BUILD = "v4.1.08_002";
let releaseState = null;
let playedReleaseRevision = null;
function releaseApiUrl() {
    return (window.PAGE302_SCORES_API || 'http://127.0.0.1:8787').replace(/\/$/, '');
}
async function refreshReleaseState() {
    if (!window.PAGE302_RELEASES_ENABLED) return null;
    const response = await fetch(releaseApiUrl() + '/api/releases', {cache:'no-store', signal:AbortSignal.timeout(10000)});
    if (!response.ok) throw new Error('RELEASE SCHEDULE UNAVAILABLE');
    const state = await response.json();
    if (state.enabled && (!Array.isArray(state.packs) || (state.currentPack !== null && !/^\d{3,}$/.test(state.currentPack)))) throw new Error('INVALID RELEASE SCHEDULE');
    releaseState = state;
    return state;
}
function releaseGapMessage() {
    return releaseState?.paused ? 'NEXT PACK PAUSED · CHECK BACK LATER' :
        releaseState?.nextOpensAt ? 'NEXT PACK OPENS ' + new Date(releaseState.nextOpensAt).toLocaleString('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',day:'2-digit',month:'short'}) + ' UK' :
        'NO ACTIVE GAME PACK · CHECK BACK LATER';
}
let answerTargetSlot = null;

const FALLBACK_VGGFAX = [

    "002"

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
    const displayedBuild = releaseState?.enabled ? APP_BUILD.replace(/_\d+$/, '_' + currentVggfax) : APP_BUILD;

    document.getElementById("buildLabel").textContent =
        displayedBuild;

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
    if (releaseState?.enabled && releaseState.currentPack === packNumber) playedReleaseRevision = releaseState.currentRevision;

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
            releaseState?.enabled && releaseState.packs.includes(packNumber) ?
                releaseApiUrl() + '/api/packs/' + packNumber : "data/vggfax" + packNumber + ".json"
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

    const state = await refreshReleaseState();
    if (state?.enabled) {
        if (!state.currentPack) throw new Error(releaseGapMessage());
        vggfax = state.packs.slice();
        currentVggfax = state.currentPack;
        await loadClub();
        return;
    }

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
async function newGame(options = {}) {
    if (window.PAGE302_RELEASES_ENABLED) {
        try {
            const state = await refreshReleaseState();
            if (state?.enabled) {
                if (!state.currentPack) { document.getElementById('answer').disabled = true; setStatus(releaseGapMessage()); return; }
                vggfax = [state.currentPack];
                currentVggfax = state.currentPack;
                vggfaxPackCache.delete(currentVggfax);
            }
        } catch(error) { document.getElementById('answer').disabled = true; setStatus(error.message); return; }
    } else {
        await selectLatestValidPack();
    }
    if (typeof resetScoreSubmission === "function") resetScoreSubmission();
    clearPendingAnswer();
    if(typeof resetTeamInput === "function")resetTeamInput();

    updateBuildLabels();

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

        "SELECT A TEAM > SELECT A POSITION > ENTER A SURNAME"

    );

    buildSquad();

    drawGame();

    if(typeof resetProgressTracking === "function") resetProgressTracking();
    if(typeof refreshChallengeDeadline === "function") refreshChallengeDeadline();
    if (!options.quiet) alert("New game started!");

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
    drawClubTitle();

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

        "CAN YOU BEAT MY PAGE302 SCORE?\n" +
        "SCORE: " +

        currentGame.score +

        "\n\n";

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

        "\nPAGE302 / GAME #" + currentVggfax + ":\n" +

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
    if (window.PAGE302_RELEASES_ENABLED && document.getElementById('answer').disabled) return;
    if (window.PAGE302_RELEASES_ENABLED && (!releaseState || (releaseState.enabled && releaseState.currentPack !== currentVggfax))) return;

    if (currentGame.gameOver) {

        return;

    }

    if (pendingAnswer) {
        return;
    }

    const request = selectedAnswerRequest();
    if (!request) return;
    const {position, clubCode, surname, playerAnswer} = request;
    answerTargetSlot = request.slot;
    currentGame.totalGuesses++;
    drawGuesses();

const matches = findPlayers(surname, position, clubCode);
if (matches.length > 1) {
    showAnswerChoices(matches, position, clubCode);
    return;
}

applyAnswer(matches[0] || null, position, clubCode, playerAnswer, surname);
}

function applyAnswer(player, position, clubCode, playerAnswer, surname, selectedName = false) {
// Replays and disambiguation must obey the same participation rule as lookup.
if (!isEligibleRecord(player)) player = null;

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

        if(typeof acceptedTeamAnswer === "function")acceptedTeamAnswer();
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

    if(squadComplete())completeGame();
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
answerTargetSlot = null;

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
    const request = { matches, position, clubCode, slot: answerTargetSlot };
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
            answerTargetSlot = request.slot;
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

function isEligibleRecord(record) {
    return !!record && Number.isInteger(record.appearances) && record.appearances > 0 &&
        Array.isArray(record.positions) &&
        !(recordIsManager(record) && record.status === "caretaker");
}

function findLinkedRecords(fullname, managersOnly) {

    let identity = normalizePersonName(fullname);
    let linkedRecords = [];

    for (let i = 0; i < clubPool.length; i++) {

        let club = clubPool[i];

        for (let j = 0; j < club.squad.length; j++) {

            let record = club.squad[j];

            if (
                isEligibleRecord(record) &&
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
    if (!isEligibleRecord(player)) throw new Error("Ineligible participation record");

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
    linkedRecords = linkedRecords.filter(link => isEligibleRecord(link.record));

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

            (usage > 0 ? " (" + usage + ")" : "");

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
if(typeof saveGameProgress === "function")saveGameProgress();

}
async function startGame() {

    updateBuildLabels();

    await selectLatestValidPack();
    updateBuildLabels();

    updateVggfaxHeader();

    applyGameFormation();

    clubUsage = {};

    usedPeople = new Set();

    console.log(clubData);

    buildSquad();

setStatus(

    "SELECT A TEAM > SELECT A POSITION > ENTER A SURNAME"

);

    drawGame();
    if(typeof restoreGameProgress === "function")restoreGameProgress();
    if(typeof refreshChallengeDeadline === "function")refreshChallengeDeadline();
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

function validAnswerNames(player) {
    return [player.surname, player.fullname, ...(player.aliases || [])];
}

function findPlayers(surname, position, clubCode) {
    const club = getClubByCode(clubCode);
    if (!club) return [];
    const answer = normalizeSearchName(surname);
    const exact = club.squad.filter(function(player) {
        return validAnswerNames(player).some(name => normalizeSearchName(name) === answer);
    });
    // An exact name at the wrong position or without participation must not become a different player.
    if (exact.length) return exact.filter(player => isEligibleRecord(player) && player.positions.includes(position));
    return club.squad.filter(function(player) {
        return isEligibleRecord(player) && player.positions.includes(position) &&
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

            isEligibleRecord(club.squad[i]) &&
            validAnswerNames(club.squad[i]).some(name =>
                normalizeSearchName(name) === normalizeSearchName(surname))

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

            selectedPosition + "  --------" && (answerTargetSlot === null || i === answerTargetSlot)

        ) {

            squad[i] =

                selectedPosition +

                "  " +

                player.surname;

            lastSquadIndex = i;
            if(typeof recordGamePick === "function")recordGamePick(player,selectedPosition,linkedClubCodes[0],i);

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

                event.key === "Enter" && !event.isComposing

            ) {

                event.preventDefault();

                submitAnswer();

            }

        }

    );
document.getElementById("answer").addEventListener("input", function() {
    if (pendingAnswer) setStatus("SELECT A TEAM > SELECT A POSITION > ENTER A SURNAME");
});
document.getElementById("answerChoices").addEventListener("keydown", function(event) {
    if (event.key === "Escape") {
        event.preventDefault();
        cancelAnswerChoice();
    }
});
startGame().catch(function(error) {

    console.error(error);
    setStatus(window.PAGE302_RELEASES_ENABLED ? error.message : "UNABLE TO LOAD A VALID GAME PACK");
    document.getElementById("answer").disabled = true;

});

// Keep an open page aware of the midnight gap and next pack. Completed results
// remain available for sharing; starting a new game explicitly selects the new pack.
if (window.PAGE302_RELEASES_ENABLED) setInterval(async function() {
    try {
        const state = await refreshReleaseState();
        if (!state?.enabled) return;
        if (!state.currentPack || state.currentPack !== currentVggfax || state.currentRevision !== playedReleaseRevision) {
            document.getElementById('answer').disabled = true;
            if (state.currentPack && currentGame.totalGuesses === 0) await newGame({quiet:true});
            else setStatus(state.currentPack ? 'NEW PACK AVAILABLE · SELECT NEW GAME' : releaseGapMessage());
        } else if (!currentGame.gameOver) document.getElementById('answer').disabled = false;
    } catch(error) { document.getElementById('answer').disabled = true; setStatus('RELEASE SCHEDULE UNAVAILABLE · TRY NEW GAME'); }
}, 30000);

