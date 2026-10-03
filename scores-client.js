// Set before this script loads. Production must supply its deployed service URL.
const scoresServiceUrl = window.PAGE302_SCORES_API ||
    (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? 'http://127.0.0.1:8787' : '');
let scoreAttempt = null;
function resetScoreSubmission() { scoreAttempt = null; }

function scoreMessage(text) {
    document.getElementById('scoreSubmissionStatus').textContent = text;
}
function prepareScoreSubmission() {
    const answers = Object.keys(squadDisplay).sort((a,b)=>Number(a)-Number(b)).map(key => {
        const answer = squadDisplay[key];
        return {personId:answer.personId,name:answer.name,position:answer.position,
            clubs:answer.clubs.slice(),contributions:answer.contributions.map(c=>({...c})),rarity:answer.rarity,clubTier:answer.clubTier};
    });
    // Reopening a completed result must not allocate a second attempt.
    const fingerprint = JSON.stringify({packId:currentVggfax,score:currentGame.score,guesses:currentGame.totalGuesses,answers});
    if (scoreAttempt && scoreAttempt.fingerprint === fingerprint) return;
    const requestId = typeof crypto.randomUUID === 'function' ? crypto.randomUUID()
        : Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
    scoreAttempt = {fingerprint,requestId,packId:currentVggfax,
        score:currentGame.score,guesses:currentGame.totalGuesses,answers,initials:null,saving:false,saved:false};
    const input=document.getElementById('scoreInitials');
    input.value='';input.disabled=false;
    const button=document.getElementById('submitScoreButton');
    button.disabled=false;button.textContent='SUBMIT SCORE';
    scoreMessage('');
}
async function submitCompletedScore(event) {
    event.preventDefault();
    const attempt=scoreAttempt;
    if(!attempt||attempt.saving||attempt.saved)return;
    const input=document.getElementById('scoreInitials');
    const initials=input.value.trim().toUpperCase();
    if(!/^[A-Z]{3}$/.test(initials)){scoreMessage('ENTER THREE LETTERS');return;}
    if(!scoresServiceUrl){scoreMessage('SCORE SERVICE NOT CONNECTED · YOUR RESULT IS STILL AVAILABLE');return;}
    // Freeze content from the first send: a lost response may still mean it saved.
    if(attempt.initials && attempt.initials!==initials){scoreMessage('KEEP THE ORIGINAL INITIALS WHEN RETRYING');return;}
    attempt.initials=initials;attempt.saving=true;input.disabled=true;
    const button=document.getElementById('submitScoreButton');button.disabled=true;button.textContent='SAVING…';
    scoreMessage('SAVING YOUR SCORE…');
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),10000);
    try{
        const response=await fetch(scoresServiceUrl.replace(/\/$/,'')+'/api/submissions',{
            method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,
            body:JSON.stringify({requestId:attempt.requestId,packId:attempt.packId,initials:attempt.initials,
                score:attempt.score,guesses:attempt.guesses,answers:attempt.answers})});
        const receipt=await response.json();
        if(!response.ok)throw new Error(receipt.error||'Unable to save');
        if(!/^\d{6}$/.test(receipt.reference)||receipt.packId!==attempt.packId||receipt.score!==attempt.score||receipt.initials!==attempt.initials)throw new Error('Invalid receipt');
        attempt.saved=true;attempt.receipt=receipt;
        if(scoreAttempt===attempt){button.textContent='SAVED';scoreMessage(receipt.initials+' · '+receipt.reference);}
    }catch(error){
        if(scoreAttempt===attempt){button.disabled=false;button.textContent='RETRY SUBMISSION';scoreMessage(error.message==='Pack is not open'?'PACK CLOSED OR NOT YET OPEN · SCORE NOT SAVED':'SAVE NOT CONFIRMED · RETRY WITH THE SAME INITIALS');}
    }finally{clearTimeout(timeout);attempt.saving=false;}
}
async function playAgainFromResult() {
    if(scoreAttempt&&!scoreAttempt.saved&&!window.confirm('Your score has not been saved. Play again anyway?'))return;
    closeCompleteGame();scoreAttempt=null;gameComplete=false;
    // Replay this pack rather than the main New Game action, which cycles packs.
    const index=vggfax.indexOf(currentVggfax);
    currentVggfax=vggfax[(index-1+vggfax.length)%vggfax.length];
    await newGame();
}
const originalShareResult=shareResult;
shareResult=async function(){
    try{await originalShareResult();}
    catch(error){if(error.name!=='AbortError')scoreMessage('SHARING UNAVAILABLE · TRY AGAIN');}
};
document.getElementById('scoreSubmissionForm').addEventListener('submit',submitCompletedScore);
