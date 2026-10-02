let publishedPack=null, resultRows=[], resultPage=0, resultLoad=0;
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
 document.getElementById('leaderboard').hidden=false;
 document.querySelector('.resultPackLine').hidden=false;
 document.getElementById('resultPrevious').hidden=true;document.getElementById('resultNext').hidden=true;
 document.getElementById('scoresOverlay').hidden=false;
 const token=++resultLoad;const status=document.getElementById('resultsStatus');status.textContent='LOADING RESULTS…';
 document.getElementById('closedResult').hidden=true;document.getElementById('leaderboardRows').replaceChildren();
 try{
  const pack=await resultsRequest('/api/results/latest');if(token!==resultLoad)return;
  publishedPack=pack;
  document.getElementById('resultSearch').hidden=!pack;
  if(!pack){status.textContent='NO CLOSED PACK RESULTS YET';return;}
  document.getElementById('leaderboardTitle').textContent='PACK '+pack.packId+' LEADERBOARD';
  document.getElementById('resultFormation').textContent='FORMATION : '+pack.formation;
  const response=await fetch('data/vggfax'+pack.packId+'.json');if(!response.ok)throw Error('PACK DETAILS UNAVAILABLE');const data=await response.json();if(token!==resultLoad)return;
  const clubs=document.getElementById('resultClubs');clubs.replaceChildren();data.clubs.forEach(c=>clubs.append(resultNode('li',c.clubCode.slice(0,3)+' - '+c.club+' '+c.season.replace(/^\d{2}(\d{2}-\d{2})$/,'$1'))));
  resultRows=pack.results;resultPage=0;renderLeaderboard();status.textContent='';
 }catch(error){if(token===resultLoad)status.textContent=error.message+' · TRY SCORES AGAIN';}
}
function hideScores(){document.getElementById('scoresOverlay').hidden=true;++resultLoad;}
function restoreFullLeaderboard(){
 if(!publishedPack){showScores();return;}
 ++resultLoad;resultRows=publishedPack.results;resultPage=0;
 document.getElementById('resultSearch').reset();document.getElementById('resultsStatus').textContent='';
 document.getElementById('closedResult').hidden=true;renderLeaderboard();
}
function backFromScores(){
 if(!document.getElementById('closedResult').hidden||document.getElementById('resultInitials').value||document.getElementById('resultReference').value){restoreFullLeaderboard();return;}
 hideScores();
}
function renderLeaderboard(){
 const body=document.getElementById('leaderboardRows');body.replaceChildren();
 resultRows.slice(resultPage*10,resultPage*10+10).forEach(r=>{
  const tr=resultNode('tr');tr.append(resultNode('td',r.rank));
  const name=resultNode('td');const button=resultNode('button',r.initials,'resultName');button.type='button';button.onclick=()=>openClosedResult(r);name.append(button);tr.append(name,resultNode('td',r.reference),resultNode('td',r.score.toLocaleString('en-GB')));
  const cubes=resultNode('td',undefined,'wideCubes');const strip=resultNode('div',undefined,'resultStrip');r.answers.forEach(a=>strip.append(resultCubes(a,true)));cubes.append(strip);tr.append(cubes);body.append(tr);
 });
 document.getElementById('resultPages').textContent=(resultPage+1)+'/'+Math.max(1,Math.ceil(resultRows.length/10));
 document.getElementById('resultPrevious').disabled=resultPage===0;document.getElementById('resultNext').disabled=(resultPage+1)*10>=resultRows.length;
 document.getElementById('resultPrevious').hidden=resultPage===0;
 document.getElementById('resultNext').hidden=(resultPage+1)*10>=resultRows.length;
}
function openClosedResult(r){
 const panel=document.getElementById('closedResult');panel.hidden=false;panel.replaceChildren();
 const heading=resultNode('div',undefined,'closedHeading');heading.append(resultNode('h2',r.initials+' · '+r.reference));
 const actions=resultNode('div',undefined,'closedActions');const share=resultNode('button','SHARE');share.type='button';share.onclick=()=>shareClosedResult(r);
 const close=resultNode('button','×');close.type='button';close.setAttribute('aria-label','Close detailed result');close.onclick=()=>panel.hidden=true;actions.append(share,close);heading.append(actions);panel.append(heading);
 panel.append(resultNode('p','RANK #'+r.rank+' · SCORE '+r.score+' · RARITY SCORE '+r.rarityScore.toFixed(1)+'%','closedMetrics'));
 r.answers.forEach(a=>{const row=resultNode('div',undefined,'closedAnswer');row.append(resultNode('span',a.position==='MAN'?'MN':a.position),resultCubes(a),resultNode('span',a.contributions.length>1?'×'+a.contributions.length:''),resultNode('span',a.name),resultNode('span',a.percentage.toFixed(1)+'%'));panel.append(row);});
 const play=resultNode('button','PLAY PAGE302','resultPlay');play.type='button';play.onclick=hideScores;panel.append(play);panel.append(resultNode('div','','closedShareStatus'));panel.scrollIntoView({behavior:'smooth',block:'nearest'});
}
async function shareClosedResult(r){
 const url=new URL(location.href);url.search='';url.hash='';url.searchParams.set('resultPack',r.packId);url.searchParams.set('resultRef',r.reference);
 const text='PAGE302 · GAME #'+r.packId+'\nRANK #'+r.rank+' · SCORE '+r.score+'\nRARITY SCORE '+r.rarityScore.toFixed(1)+'%\n'+url.href+'\n\nPLAY PAGE302: '+new URL('./',location.href).href;
 try{if(navigator.share)await navigator.share({title:'Page302 result',text});else await navigator.clipboard.writeText(text);document.querySelector('.closedShareStatus').textContent='SHARED / COPIED';}catch(error){if(error.name!=='AbortError')document.querySelector('.closedShareStatus').textContent='SHARING UNAVAILABLE';}
}
document.getElementById('resultSearch').onsubmit=async event=>{
 event.preventDefault();if(!publishedPack)return;const status=document.getElementById('resultsStatus');const token=++resultLoad;
 const query=new URLSearchParams({initials:document.getElementById('resultInitials').value.trim().toUpperCase(),reference:document.getElementById('resultReference').value.trim()});
 try{const rows=await resultsRequest('/api/results/'+publishedPack.packId+'?'+query);if(token!==resultLoad)return;resultRows=rows;resultPage=0;renderLeaderboard();status.textContent=rows.length?'':'NO MATCHING SCORES';document.getElementById('closedResult').hidden=true;}catch(error){if(token===resultLoad)status.textContent=error.message;}
};
document.getElementById('resultPrevious').onclick=()=>{resultPage--;renderLeaderboard()};document.getElementById('resultNext').onclick=()=>{resultPage++;renderLeaderboard()};
document.getElementById('resultTop').onclick=restoreFullLeaderboard;
async function loadSharedResult(){const params=new URLSearchParams(location.search);const pack=params.get('resultPack'),reference=params.get('resultRef');if(!/^\d{3,}$/.test(pack||'')||!/^\d{6}$/.test(reference||''))return;
 document.getElementById('scoresOverlay').hidden=false;document.getElementById('resultSearch').hidden=true;
 document.getElementById('leaderboard').hidden=true;document.querySelector('.resultPackLine').hidden=true;document.getElementById('resultPrevious').hidden=true;document.getElementById('resultNext').hidden=true;document.getElementById('resultPages').textContent='';
 try{const rows=await resultsRequest('/api/results/'+pack+'?reference='+reference);if(!rows.length)throw Error('RESULT NOT FOUND');document.getElementById('leaderboardTitle').textContent='PACK '+pack+' RESULT';openClosedResult(rows[0]);}catch(error){document.getElementById('resultsStatus').textContent=error.message;}}
loadSharedResult();

