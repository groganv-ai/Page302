let publishedPack=null, resultRows=[], resultPage=0, resultLoad=0, resultRanking="score", resultFiltered=false;
let resultDirections={score:"highest",rarity:"lowest"};
const RESULT_PAGE_SIZE=15;
function resultNode(tag,text,className){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;}
function resultCubes(answer, compact=false){
 const pair=resultNode('span',undefined,'resultCubePair');
 const colors={UNI:'#ff00ff',SUB:'#00ffff',UTL:'#00ff00',ENG:'#ffff00',LEG:'#fff'};
 const cube=resultNode('span',compact&&answer.contributions.length>1?'*':'','resultCube');
 cube.style.background=answer.position==='MAN'?(colors[answer.rarity]||'#fff'):(['','#ff00ff','#00ffff','#00ff00','#ffff00','#fff'][answer.clubTier]||'#fff');
 pair.append(cube);
 if(answer.position!=='MAN'){const rarity=resultNode('span','','resultCube');rarity.style.background=colors[answer.rarity]||'#fff';pair.append(rarity);}
 return pair;
}
async function resultsRequest(path){if(!scoresServiceUrl)throw Error('SCORE SERVICE NOT CONNECTED');const response=await fetch(scoresServiceUrl.replace(/\/$/,'')+path,{signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('RESULTS UNAVAILABLE');return response.json();}
async function showScores(){
 document.getElementById('rarestAward').hidden=true;
 document.getElementById('leaderboard').hidden=false;
 document.querySelector('.resultPackLine').hidden=false;
 document.getElementById('resultPrevious').hidden=true;document.getElementById('resultNext').hidden=true;
 document.getElementById('scoresOverlay').hidden=false;
 const token=++resultLoad;const status=document.getElementById('resultsStatus');status.textContent='LOADING RESULTS…';
 document.getElementById('closedResult').hidden=true;document.getElementById('leaderboardRows').replaceChildren();
 try{
  const pack=await resultsRequest('/api/results/latest');if(token!==resultLoad)return;
  publishedPack=null;
  document.getElementById('resultSearch').hidden=!pack;
  if(!pack){status.textContent='NO CLOSED PACK RESULTS YET';return;}
  document.getElementById('leaderboardTitle').textContent='PACK '+pack.packId+' LEADERBOARD TOP 30';
  document.getElementById('resultFormation').textContent='FORMATION : '+pack.formation;
  let response=await fetch('data/vggfax'+pack.packId+'.json');
  if(!response.ok&&scoresServiceUrl)response=await fetch(scoresServiceUrl.replace(/\/$/,'')+'/api/packs/'+pack.packId);
  if(!response.ok)throw Error('PACK DETAILS UNAVAILABLE');const data=await response.json();if(token!==resultLoad)return;
  const clubs=document.getElementById('resultClubs');clubs.replaceChildren();data.clubs.forEach(c=>{const row=resultNode('li');row.append(resultNode('span',fullResultClubName(c.club)),resultNode('span',c.season.replace(/^\d{2}(\d{2}[-/])/, '$1')));clubs.append(row);});
  document.getElementById('resultClubDetails').open=false;
  const allResults=await resultsRequest('/api/results/'+pack.packId);if(token!==resultLoad)return;
  publishedPack={...pack,results:allResults};resultRanking='score';resultFiltered=false;
resultDirections={score:"highest",rarity:"lowest"};
  document.getElementById('resultSearch').reset();renderRarestAward(allResults);
  updateLeaderboard();status.textContent='';
 }catch(error){if(token===resultLoad)status.textContent=error.message+' · TRY SCORES AGAIN';}
}
function hideScores(){document.getElementById('scoresOverlay').hidden=true;++resultLoad;}
function restoreFullLeaderboard(){
 if(!publishedPack){showScores();return;}
 ++resultLoad;resultFiltered=false;
 document.getElementById('resultSearch').reset();document.getElementById('resultsStatus').textContent='';
 document.getElementById('closedResult').hidden=true;updateLeaderboard();
}
function backFromScores(){
 if(!document.getElementById('closedResult').hidden||document.getElementById('resultReference').value){restoreFullLeaderboard();return;}
 hideScores();
}
function renderLeaderboard(){
 const body=document.getElementById('leaderboardRows');body.replaceChildren();
 resultRows.slice(resultPage*RESULT_PAGE_SIZE,resultPage*RESULT_PAGE_SIZE+RESULT_PAGE_SIZE).forEach(r=>{
  const tr=resultNode('tr');tr.append(resultNode('td',r.rank));
  const name=resultNode('td');const button=resultNode('button',r.initials,'resultName');button.type='button';button.onclick=()=>openClosedResult(r);name.append(button);tr.append(name,resultNode('td',r.score.toLocaleString('en-GB')),resultNode('td',r.rarityScore.toFixed(1)+'%'));
  const cubes=resultNode('td',undefined,'wideCubes');const strip=resultNode('div',undefined,'resultStrip');r.answers.forEach(a=>strip.append(resultCubes(a,true)));cubes.append(strip);tr.append(cubes);body.append(tr);
 });
 document.getElementById('resultPages').textContent=(resultPage+1)+'/'+Math.max(1,Math.ceil(resultRows.length/RESULT_PAGE_SIZE));
 document.getElementById('resultPrevious').disabled=resultPage===0;document.getElementById('resultNext').disabled=(resultPage+1)*RESULT_PAGE_SIZE>=resultRows.length;
 document.getElementById('resultPrevious').hidden=resultPage===0;
 document.getElementById('resultNext').hidden=(resultPage+1)*RESULT_PAGE_SIZE>=resultRows.length;
}
function openClosedResult(r){
 const panel=document.getElementById('closedResult');panel.hidden=false;panel.replaceChildren();
 const heading=resultNode('div',undefined,'closedHeading');heading.append(resultNode('h2',r.initials));
 const actions=resultNode('div',undefined,'closedActions');const share=resultNode('button','SHARE');share.type='button';share.onclick=()=>shareClosedResult(r);
 const close=resultNode('button','×');close.type='button';close.setAttribute('aria-label','Close detailed result');close.onclick=()=>panel.hidden=true;actions.append(share,close);heading.append(actions);panel.append(heading);
 panel.append(resultNode('p','RANK #'+r.rank+' · SCORE '+r.score+' · RARITY '+r.rarityScore.toFixed(1)+'%','closedMetrics'));
 r.answers.forEach(a=>{const row=resultNode('div',undefined,'closedAnswer');row.append(resultNode('span',a.position==='MAN'?'MN':a.position),resultCubes(a),resultNode('span',a.contributions.length>1?'×'+a.contributions.length:''),resultNode('span',a.name),resultNode('span',a.percentage.toFixed(1)+'%'));panel.append(row);});
 const play=resultNode('button','PLAY PAGE302','resultPlay');play.type='button';play.onclick=hideScores;panel.append(play);panel.append(resultNode('div','','closedShareStatus'));panel.scrollIntoView({behavior:'smooth',block:'nearest'});
}
async function shareClosedResult(r){
 const url=new URL(location.href);url.search='';url.hash='';url.searchParams.set('resultPack',r.packId);url.searchParams.set('resultRef',r.reference);
 const text='PAGE302 · GAME #'+r.packId+'\nRANK #'+r.rank+' · SCORE '+r.score+'\nRARITY '+r.rarityScore.toFixed(1)+'%\n'+url.href+'\n\nPLAY PAGE302: '+new URL('./',location.href).href;
 try{if(navigator.share)await navigator.share({title:'Page302 result',text});else await navigator.clipboard.writeText(text);document.querySelector('.closedShareStatus').textContent='SHARED / COPIED';}catch(error){if(error.name!=='AbortError')document.querySelector('.closedShareStatus').textContent='SHARING UNAVAILABLE';}
}
document.getElementById('resultSearch').onsubmit=async event=>{
 event.preventDefault();if(!publishedPack)return;const status=document.getElementById('resultsStatus');const token=++resultLoad;
 resultFiltered=Boolean(document.getElementById('resultReference').value.trim());
 updateLeaderboard();status.textContent=resultRows.length?'':'NO MATCHING SCORES';document.getElementById('closedResult').hidden=true;
};
document.getElementById('resultPrevious').onclick=()=>{resultPage--;renderLeaderboard()};document.getElementById('resultNext').onclick=()=>{resultPage++;renderLeaderboard()};
async function loadSharedResult(){const params=new URLSearchParams(location.search);const pack=params.get('resultPack'),reference=params.get('resultRef');if(!/^\d{3,}$/.test(pack||'')||!/^\d{6}$/.test(reference||''))return;
 document.getElementById('scoresOverlay').hidden=false;document.getElementById('resultSearch').hidden=true;document.getElementById('rarestAward').hidden=true;
 document.getElementById('leaderboard').hidden=true;document.querySelector('.resultPackLine').hidden=true;document.getElementById('resultPrevious').hidden=true;document.getElementById('resultNext').hidden=true;document.getElementById('resultPages').textContent='';
 try{const rows=await resultsRequest('/api/results/'+pack+'?reference='+reference);if(!rows.length)throw Error('RESULT NOT FOUND');document.getElementById('leaderboardTitle').textContent='PACK '+pack+' RESULT';openClosedResult(rows[0]);}catch(error){document.getElementById('resultsStatus').textContent=error.message;}}
loadSharedResult();


function updateLeaderboard(){
 if(!publishedPack)return;
 const reference=document.getElementById('resultReference').value.trim();
 const ranked=rankPublishedResults(publishedPack.results,resultRanking,resultDirections[resultRanking]);
 resultRows=ranked.filter(r=>resultFiltered?(!reference||r.reference===reference):r.rank<=30);
 resultPage=0;
 for(const method of ['score','rarity']){
  const button=document.getElementById(method==='score'?'resultScore':'resultRarity');
  const highest=resultDirections[method]==='highest';
  button.textContent=method.toUpperCase()+' '+(highest?'\u2191':'\u2193');
  button.setAttribute('aria-pressed',String(resultRanking===method));
  button.title=(highest?'HIGHEST':'LOWEST')+' FIRST';
  button.setAttribute('aria-label',method.toUpperCase()+': '+button.title);
 }
 document.getElementById('resultSortStatus').textContent=resultRanking.toUpperCase()+': '+(resultDirections[resultRanking]==='highest'?'HIGHEST FIRST \u2191':'LOWEST FIRST \u2193');
 renderLeaderboard();
}
for(const method of ['score','rarity'])document.getElementById(method==='score'?'resultScore':'resultRarity').onclick=()=>{
 if(resultRanking===method)resultDirections[method]=resultDirections[method]==='highest'?'lowest':'highest';
 resultRanking=method;document.getElementById('closedResult').hidden=true;updateLeaderboard();
};
function renderRarestAward(results){
 const panel=document.getElementById('rarestAward');panel.replaceChildren();
 const winners=rarestPublishedAnswers(results);panel.hidden=!winners.length;if(!winners.length)return;
 const details=resultNode('details');
 details.append(resultNode('summary',winners.length===1?'Rarest Player':'Rarest Players ('+winners.length+')'));
 details.append(resultNode('p',winners[0].percentage.toFixed(1)+'%','rarestPercentage'));
 const list=resultNode('ul');winners.forEach(answer=>list.append(resultNode('li',answer.name)));
 details.append(list);panel.append(details);
}

function fullResultClubName(name){
 const names={'Blackburn':'Blackburn Rovers','Bolton':'Bolton Wanderers','Brighton':'Brighton & Hove Albion','Cardiff':'Cardiff City','Charlton':'Charlton Athletic','Coventry':'Coventry City','Ipswich':'Ipswich Town','Leeds':'Leeds United','Leicester':'Leicester City','Man City':'Manchester City','Man United':'Manchester United','Man Utd':'Manchester United','Newcastle':'Newcastle United',"Nott'm Forest":'Nottingham Forest','QPR':'Queens Park Rangers','Stoke':'Stoke City','Swansea':'Swansea City','Tottenham':'Tottenham Hotspur','West Ham':'West Ham United','Wigan':'Wigan Athletic'};
 return names[name]||name;
}
