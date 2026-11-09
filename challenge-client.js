let challengeClock=null;
let challengeRequest=0;
async function challengeRequestJson(path){
 const response=await fetch(scoresServiceUrl.replace(/\/$/,'')+path,{cache:'no-store',signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw Error('Challenge service unavailable');
 return response.json();
}
function drawChallengeDeadline(){
 const label=document.getElementById('submissionDeadline');
 label.removeAttribute('title');
 label.removeAttribute('aria-label');
 const date=document.getElementById('challengeDate');
 const clockNow=challengeClock?Date.parse(challengeClock.data.serverTime)+(performance.now()-challengeClock.received):Date.now();
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',weekday:'short',day:'numeric',month:'short'}).formatToParts(new Date(clockNow));
 const part=type=>parts.find(p=>p.type===type).value;
 const cutoff=challengeClock?.data.closesAt?new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZoneName:'short'}).format(new Date(challengeClock.data.closesAt)):'--:--';
 date.textContent='DEADLINE: '+part('weekday')+' '+part('day')+' '+part('month')+' '+cutoff+' -';
 date.dateTime=new Date(clockNow).toISOString();
 if(!challengeClock){label.textContent='DEADLINE UNAVAILABLE';return;}
 const {data,received}=challengeClock;
 if(performance.now()-received>120000){label.textContent='CHECKING DEADLINE…';return;}
 const now=Date.parse(data.serverTime)+(performance.now()-received);
 if(data.status==='closed'||data.closesAt&&now>=Date.parse(data.closesAt)){label.textContent='CHALLENGE CLOSED';return;}
 if(now<Date.parse(data.opensAt)){label.textContent='CHALLENGE NOT YET OPEN';return;}
 if(!data.closesAt){label.textContent='NO DEADLINE SET';return;}
 const seconds=Math.max(0,Math.ceil((Date.parse(data.closesAt)-now)/1000));
 const days=Math.floor(seconds/86400);
 const time=[Math.floor(seconds/3600)%24,Math.floor(seconds/60)%60,seconds%60].map(n=>String(n).padStart(2,'0')).join(':');
 label.textContent=(days?days+'D ':'')+time;
 label.setAttribute('aria-label','Closes in '+(days?days+' days ':'')+time);
 label.title='Challenge deadline: '+new Date(data.closesAt).toLocaleString('en-GB',{timeZone:'Europe/London',timeZoneName:'short'});
}
async function refreshChallengeDeadline(){
 const request=++challengeRequest,pack=currentVggfax;challengeClock=null;drawChallengeDeadline();
 if(!scoresServiceUrl)return;
 try{
  const data=await challengeRequestJson('/api/challenges/'+pack);
  if(request!==challengeRequest||pack!==currentVggfax)return;
  if(data.packId!==pack||!Number.isFinite(Date.parse(data.serverTime))||!Number.isFinite(Date.parse(data.opensAt))||data.closesAt&&!Number.isFinite(Date.parse(data.closesAt)))throw Error('Invalid schedule');
  challengeClock={data,received:performance.now()};drawChallengeDeadline();
 }catch{if(request===challengeRequest){challengeClock=null;drawChallengeDeadline();}}
}
let standingRequest=0;
async function refreshCurrentStanding(){
 const box=document.getElementById('currentStanding'),attempt=scoreAttempt;
 const request=++standingRequest;
 if(!attempt?.saved||!attempt.receipt){box.textContent='';return;}
 box.textContent='CHECKING CURRENT STANDING…';
 try{
  const standing=await challengeRequestJson('/api/standing/'+attempt.packId+'/'+attempt.receipt.reference);
  if(request!==standingRequest||scoreAttempt!==attempt)return;
  const top=standing.topPercent;
  if(![10,25,50,60,70,80,90].includes(top)&&standing.outsideTop90!==true)throw Error('Invalid standing');
  const label=standing.outsideTop90?'OUTSIDE TOP 90%':'TOP '+top+'%';
  box.textContent=(standing.final?'FINAL STANDING: ':'CURRENTLY ')+label;
  if(!standing.final)box.append(document.createElement('br'),document.createTextNode('STANDING MAY CHANGE UNTIL FINAL RESULTS'));
 }catch{if(request===standingRequest&&scoreAttempt===attempt)box.textContent='SCORE SAVED · CURRENT STANDING UNAVAILABLE';}
}
setInterval(drawChallengeDeadline,1000);
setInterval(()=>{if(!document.hidden){refreshChallengeDeadline();if(document.getElementById('gameCompleteOverlay').style.display==='flex')refreshCurrentStanding();}},60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden){refreshChallengeDeadline();if(document.getElementById('gameCompleteOverlay').style.display==='flex')refreshCurrentStanding();}});
refreshChallengeDeadline();
