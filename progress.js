/* Local recovery is not proof of a backend submission. Replay accepted picks
   through the current rules, rather than trusting stored squads or points. */
let progressPicks=[];
let restoringProgress=false;
let progressReady=false;
function progressKey(){return 'page302.progress.v1.'+currentVggfax;}
function packSignature(){return JSON.stringify(packData);}
function recordGamePick(player,position,club){
    if(!restoringProgress)progressPicks.push({name:player.fullname,position,club});
}
function saveGameProgress(){
    if(!progressReady||restoringProgress)return;
    try {
        const attempt=typeof scoreAttempt==='undefined'?null:scoreAttempt;
        const record={version:1,pack:currentVggfax,signature:packSignature(),formation:currentGame.formation,
            picks:progressPicks,guesses:currentGame.totalGuesses,score:currentGame.score,
            attempt:attempt?{...attempt,saving:false}:null};
        localStorage.setItem(progressKey(),JSON.stringify(record));
    }catch{/* Disabled storage must never stop a game. */}
}
function resetProgressTracking(){progressPicks=[];progressReady=true;saveGameProgress();}
function restoreGameProgress(){
    progressReady=true;
    let record;
    try {record=JSON.parse(localStorage.getItem(progressKey()));}catch{return;}
    if(!record)return;
    const valid=record.version===1&&record.pack===currentVggfax&&record.signature===packSignature()&&
        record.formation===currentGame.formation&&Array.isArray(record.picks)&&record.picks.length<=12&&
        Number.isSafeInteger(record.guesses)&&record.guesses>=record.picks.length&&record.guesses<=1000000&&
        Number.isSafeInteger(record.score)&&record.score>=0;
    if(!valid){try{localStorage.removeItem(progressKey());}catch{}return;}
    restoringProgress=true;
    try {
        for(const pick of record.picks){
            if(!pick||typeof pick.name!=='string'||typeof pick.club!=='string'||!['GK','DF','MD','AT','MAN'].includes(pick.position))throw Error('Invalid pick');
            const club=getClubByCode(pick.club);
            const player=club?.squad.find(p=>p.fullname===pick.name&&p.positions.includes(pick.position));
            const before=Object.keys(squadDisplay).length;
            if(!player)throw Error('Changed player');
            applyAnswer(player,pick.position,pick.club,'',player.surname,true);
            if(Object.keys(squadDisplay).length!==before+1)throw Error('Invalid recovery');
        }
        if(currentGame.score!==record.score)throw Error('Changed score');
        progressPicks=record.picks;currentGame.totalGuesses=record.guesses;refreshScreen();
        if(squadComplete()&&record.attempt&&typeof prepareScoreSubmission==='function'){
            prepareScoreSubmission();
            const saved=record.attempt;
            if(saved.fingerprint===scoreAttempt.fingerprint&&/^[\w-]{16,80}$/.test(saved.requestId)&&
                (saved.initials===null||/^[A-Z]{3}$/.test(saved.initials))){
                // Reuse the request ID even for an unconfirmed/lost response.
                scoreAttempt.requestId=saved.requestId;scoreAttempt.initials=saved.initials;
                document.getElementById('scoreInitials').value=saved.initials||'';
                document.getElementById('scoreInitials').disabled=!!saved.initials;
                // Only a newly verified backend receipt can restore SAVED.
                scoreMessage('RESTORED RESULT · SUBMIT TO CONFIRM YOUR RECEIPT');
            }
        }
    }catch{
        progressPicks=[];squadDisplay={};clubUsage={};usedPeople=new Set();lastSquadIndex=-1;
        lastPlayer=null;lastClubCode=null;lastRarity=null;
        currentGame.score=0;currentGame.totalGuesses=0;currentGame.gameOver=false;gameComplete=false;
        buildSquad();refreshScreen();setStatus('SAVED PROGRESS COULD NOT BE RESTORED · START A NEW SQUAD');
        try{localStorage.removeItem(progressKey());}catch{}
    }finally{restoringProgress=false;}
}
window.addEventListener('pagehide',saveGameProgress);
