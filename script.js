let currentGame = {

    totalGuesses: 0,

    formation: "4-4-2",

    score: 0,

    gameOver: false

};

let formations = [

    "4-4-2",

    "4-3-3",

    "5-4-1",

    "4-5-1"

];

let squad = [

    "GK  --------",
    "",

    "DF  --------",
    "DF  --------",
    "DF  --------",
    "DF  --------",
    "",

    "MD  --------",
    "MD  --------",
    "MD  --------",
    "MD  --------",
    "",

    "AT  --------",
    "AT  --------",
    "",

    "MAN  --------"

];
let clubData;

let clubPool = [];

let lastPlayer = null;

let lastRarity = null;

let lastSquadIndex = -1;

let squadDisplay = {};

async function loadClub() {

    let clubFiles = [

        "ars0304.json",
        "bla9495.json",
        "car1314.json",
        "cov0001.json",
        "lei1516.json",
        "liv1920.json",
        "mci1112.json",
        "mun9899.json",
        "new9596.json",
        "nfo9293.json",
        "tot1819.json"

    ];

    clubPool = [];

    for (

        let i = 0;

        i < clubFiles.length;

        i++

    ) {

        let response =

            await fetch(

                "data/" +

                clubFiles[i]

            );

        let club =

            await response.json();

        clubPool.push(

            club

        );

    }

    clubData =

        clubPool[

            Math.floor(

                Math.random() *

                clubPool.length

            )

        ];

}
async function newGame() {

    currentGame.totalGuesses = 0;

    currentGame.score = 0;

    currentGame.gameOver = false;

    lastPlayer = null;

    lastRarity = null;

    lastSquadIndex = -1;

    squadDisplay = {};

    document.getElementById(
        "answer"
    ).disabled = false;

    await loadClub();

    currentGame.formation =

        formations[
            Math.floor(
                Math.random() * formations.length
            )
        ];

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
function submitAnswer() {

    if (currentGame.gameOver) {

        return;

    }

    currentGame.totalGuesses =
    currentGame.totalGuesses + 1;

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

        parts.length != 3

    ) {

        setStatus(

            "FORMAT: AT PLANK GER"

        );

        return;

    }

    let position =

    parts[0]
    .trim()
    .toUpperCase();

    let surname =

    parts[1]
    .trim();

    let clubCode =

    parts[2]
    .trim()
    .toUpperCase();

    if (

        playerAnswer == ""

    ) {

        setStatus(

            "ENTER A PLAYER"

        );

        return;

    }

let player =
findPlayer(

    surname,

    position,

    clubCode

);

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

        player.positions[0] +

        " " +

        player.surname.toUpperCase() +

        " - ALREADY USED"

    );

}

else if (

    hasFreePosition(
    player
    ) == false

) {

    setStatus(

        player.positions[0] +

        " " +

        player.surname.toUpperCase() +

        " - POSITION FULL"

    );

}

    else {

        let rarity =
        getRarity(
        player
        );

        lastPlayer =
        player.surname;

        lastRarity =
        rarity;

        addPlayerToSquad(
        player
        );

        currentGame.score =
        currentGame.score +
        rarity.points;

        refreshScreen();

if (

    squadComplete()

) {

    currentGame.gameOver =
    true;

    document.getElementById(
    "answer"
    ).disabled = true;

    setStatus(

        player.positions[0] +

        " " +

        player.surname.toUpperCase() +

        " - CORRECT" +

        "\n\nTEAM COMPLETE" +

        "\n\nFINAL SCORE : " +

        currentGame.score +

        "\n\nTOTAL GUESSES : " +

        currentGame.totalGuesses

    );

}

else {

    setStatus(

        player.positions[0] +

        " " +

        player.surname.toUpperCase() +

        " - CORRECT"

    );

}

    }

    document.getElementById(
    "answer"
    ).value = "";

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
function playerAlreadyUsed(player) {

    for (

        let i = 0;

        i < squad.length;

        i++

    ) {

        if (

            squad[i].includes(
            player.surname
            )

        ) {

            return true;

        }

    }

    return false;

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
function drawSquad() {

    let html = "";

    for (

        let i = 0;

        i < squad.length;

        i++

    ) {

        let line = squad[i];

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

            let badge =

            "<span style='color:" +

            colour +

            "; font-weight:bold;'>" +

            squadDisplay[i].score +

            " " +

            squadDisplay[i].rarity +

            "</span>";

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

    document.getElementById(
    "formationDisplay").innerText =
    "FORMATION: " +
    currentGame.formation;

}
function buildSquad() {

    if (currentGame.formation == "4-4-2") {

        squad = [

            "GK  --------",
            "",

            "DF  --------",
            "DF  --------",
            "DF  --------",
            "DF  --------",
            "",

            "MD  --------",
            "MD  --------",
            "MD  --------",
            "MD  --------",
            "",

            "AT  --------",
            "AT  --------",
            "",

            "MAN  --------"

        ];

    }

    else if (currentGame.formation == "4-3-3") {

        squad = [

            "GK  --------",
            "",

            "DF  --------",
            "DF  --------",
            "DF  --------",
            "DF  --------",
            "",

            "MD  --------",
            "MD  --------",
            "MD  --------",
            "",

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
            "",

            "DF  --------",
            "DF  --------",
            "DF  --------",
            "DF  --------",
            "DF  --------",
            "",

            "MD  --------",
            "MD  --------",
            "MD  --------",
            "MD  --------",
            "",

            "AT  --------",
            "",

            "MAN  --------"

        ];

    }

    else if (currentGame.formation == "4-5-1") {

        squad = [

            "GK  --------",
            "",

            "DF  --------",
            "DF  --------",
            "DF  --------",
            "DF  --------",
            "",

            "MD  --------",
            "MD  --------",
            "MD  --------",
            "MD  --------",
            "MD  --------",
            "",

            "AT  --------",
            "",

            "MAN  --------"

        ];

    }

}
function drawClubTitle() {

    let text =

        "TARGET CLUBS\n\n";

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

        text +=

            "(" +

            shortCode +

            ") - " +

            club.club +

            " " +

            club.season +

            "\n";

    }

    document.getElementById(
        "clubTitle"
    ).innerText = text;

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

    document.getElementById(
    "guessDisplay"
    ).innerText =

    "GUESSES : " +

    currentGame.totalGuesses;

}
function setStatus(text) {

    document.getElementById(
    "result"
    ).innerText = text;

}
async function startGame() {

    await loadClub();

    console.log(clubData);

    buildSquad();

setStatus(

    "ENTER ANSWER AS" +

    "\n\nPOS SURNAME CLUB" +

    "\n\ne.g. AT PLANK GER"

);

    drawGame();

}
function findPlayer(

    surname,

    position,

    clubCode

) {

    let club =

        getClubByCode(
            clubCode
        );

    if (

        club == null

    ) {

        return null;

    }

    for (

        let i = 0;

        i < club.squad.length;

        i++

    ) {

        let player =

            club.squad[i];

        if (

            player.surname
            .toLowerCase()

            ==

            surname
            .toLowerCase()

        ) {

            if (

                player.positions.includes(
                    position
                )

            ) {

                return player;

            }

        }

    }

    return null;

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

            club.squad[i]
            .surname
            .toLowerCase()

            ==

            surname
            .toLowerCase()

        ) {

            return true;

        }

    }

    return false;

}
function hasFreePosition(player) {

    for (

        let i = 0;

        i < squad.length;

        i++

    ) {

        for (

            let j = 0;

            j < player.positions.length;

            j++

        ) {

            let position =
            player.positions[j];

            if (

                squad[i] ==

                position + "  --------"

            ) {

                return true;

            }

        }

    }

    return false;

}
function addPlayerToSquad(player) {

    for (

        let i = 0;

        i < squad.length;

        i++

    ) {

        for (

            let j = 0;

            j < player.positions.length;

            j++

        ) {

            let position =
            player.positions[j];

            if (

                squad[i] ==

                position + "  --------"

            ) {

                squad[i] =

                position +

                "  " +

                player.surname;

                lastSquadIndex = i;

                squadDisplay[i] = {

                    score:
                    lastRarity == null
                    ?
                    0
                    :
                    lastRarity.points,

                    rarity:
                    lastRarity == null
                    ?
                    ""
                    :
                    lastRarity.short

                };

                return;

            }

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
startGame();
