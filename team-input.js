/* Selection and presentation only. Accepted answers and scores use the existing engine. */
let selectedTeamSlot=null,selectedTeamClub=null;
let revealTeamSlot=null;
function clearAnswerFeedback(){
 clearPendingAnswer();
 document.getElementById('lastAnswer').hidden=true;
 document.getElementById('result').textContent='';
}
const teamInput=document.getElementById('answer');
const teamPanel=document.getElementById('squadBoard').closest('.panel');
const clubsPanel=document.getElementById('clubTitle').closest('.panel');
teamPanel.classList.add('teamPanel');clubsPanel.classList.add('clubsPanel');
teamPanel.parentElement.insertBefore(clubsPanel,teamPanel);
document.querySelectorAll('.legendRow').forEach(row=>{
 const usage=Array.from(row.children).find(panel=>/CLUB (USAGE|BONUS)/.test(panel.textContent));
 if(usage){usage.querySelector('.legendTitle').textContent='CLUB USAGE';row.prepend(usage);}
 const rarity=Array.from(row.children).find(panel=>panel!==usage);
 if(rarity){rarity.querySelector('.legendTitle').textContent='PLAYER RARITY';if(row.classList.contains('legendRowMobile'))row.prepend(rarity);}
});
const teamContext=document.createElement('span');teamContext.className='inputContext';
document.querySelector('.answerRow').insertBefore(teamContext,document.querySelector('.answerInputShell'));
const selectionHint=document.createElement('div');selectionHint.className='selectionHint';selectionHint.setAttribute('role','status');
document.querySelector('.inputLeft').append(selectionHint);
function updateTeamHint(){
 const ready=selectedTeamSlot!==null&&!!selectedTeamClub;
 document.querySelector('.answerLabel').classList.toggle('answerNotReady',!ready);
 document.querySelector('.answerLabel .entryBall').src=ready?'assets/ball.svg':'assets/ball-grey.svg';
 teamContext.replaceChildren();teamContext.hidden=selectedTeamSlot===null&&!selectedTeamClub;
 const addChip=(text,label,clear)=>{
  const button=document.createElement('button');button.type='button';button.textContent=text+' ×';button.setAttribute('aria-label',label);button.onclick=()=>{clearPendingAnswer();clear();drawSquad();drawClubTitle();};teamContext.append(button);
 };
 if(selectedTeamSlot!==null)addChip(displayPosition(squad[selectedTeamSlot].split(' ')[0]),'Clear selected position',()=>{selectedTeamSlot=null;});
 if(selectedTeamClub){
  const club=getClubByCode(selectedTeamClub),season=club.season.replace(/^\d{2}(\d{2}-\d{2})$/,'$1');
  addChip(club.club+' '+season,'Clear selected club',()=>{selectedTeamClub=null;});
 }
 selectionHint.textContent=[!selectedTeamClub?'SELECT A TEAM':null,selectedTeamSlot===null?'SELECT A POSITION':null,'ENTER A SURNAME'].filter(Boolean).join(' > ');
}
function resetTeamInput(){selectedTeamSlot=null;selectedTeamClub=null;answerTargetSlot=null;updateTeamHint();}
function acceptedTeamAnswer(){revealTeamSlot=restoringProgress?null:lastSquadIndex;resetTeamInput();}
function selectedAnswerRequest(){
 const surname=teamInput.value.trim();
 if(selectedTeamSlot===null||!selectedTeamClub){setStatus(selectionHint.textContent);return null;}
 if(!surname){setStatus('ENTER A SURNAME');teamInput.focus();return null;}
 if(squadDisplay[selectedTeamSlot]||!squad[selectedTeamSlot]){resetTeamInput();setStatus('SELECT A POSITION');return null;}
 return {slot:selectedTeamSlot,position:squad[selectedTeamSlot].split(' ')[0],clubCode:selectedTeamClub,surname,playerAnswer:surname};
}
function focusSelectedAnswer(){
 if(selectedTeamSlot===null||!selectedTeamClub)return;
 document.querySelector('.inputArea').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});
 teamInput.focus({preventScroll:true});
}
function selectionRow(className,text){
 const button=document.createElement('button');button.type='button';button.className=className;button.setAttribute('aria-label',text);
 for(const side of ['left','label','right']){
  const span=document.createElement('span');span.className=side==='label'?'pickLabel':'pickDashes';
  span.textContent=side==='label'?text:'';if(side!=='label')span.setAttribute('aria-hidden','true');button.append(span);
 }
 return button;
}
function colourLabel(text,colour){const span=document.createElement('span');span.textContent=text;span.style.color=colour;return span;}
function fitTeamRows(){
 const measure=document.createElement('canvas').getContext('2d');
 document.querySelectorAll('.pickLabel').forEach(label=>{
  label.style.fontSize='';const available=Math.max(1,label.parentElement.clientWidth-40);
  if(label.scrollWidth>available)label.style.fontSize=(parseFloat(getComputedStyle(label).fontSize)*available/label.scrollWidth)+'px';
  const dashes=label.parentElement.querySelectorAll('.pickDashes');const style=getComputedStyle(dashes[0]);measure.font=style.font;
  const dashWidth=measure.measureText('-').width+(parseFloat(style.letterSpacing)||0)||1;
  const count=Math.max(0,Math.floor((Math.min(dashes[0].clientWidth,dashes[1].clientWidth)-1)/dashWidth));
  dashes.forEach(span=>span.textContent='-'.repeat(count));
 });
}
drawSquad=function(){
 const board=document.getElementById('squadBoard');board.replaceChildren();
 squad.forEach((line,slot)=>{
  if(!line)return;
  const position=line.split(' ')[0],answer=squadDisplay[slot];
  const text=answer?line.replace(/^MAN/,'MN')+' '+answer.club+' x '+answer.rarity:displayPosition(position);
  const button=selectionRow('positionPick',text);button.disabled=!!answer||currentGame.gameOver;
  button.dataset.slot=slot;button.dataset.position=position;
  button.setAttribute('aria-pressed',String(selectedTeamSlot===slot));
  if(position==='MAN')button.classList.add('managerPick');
  if(answer){
   const label=button.querySelector('.pickLabel');label.replaceChildren(document.createTextNode(line.replace(/^MAN/,'MN')+' '));
   answer.clubs.forEach((code,index)=>{
    if(index)label.append(document.createTextNode('/'));
    label.append(colourLabel(code,answer.isManager?'#ffffff':feedbackTierColours[index===0?answer.clubTier:getClubTier(code)]));
   });
   label.append(document.createTextNode(' x '),colourLabel(answer.rarity,feedbackRarityColours[answer.rarity]));
   if(slot===lastSquadIndex)button.classList.add('latestAnswer');
   if(slot===revealTeamSlot){
    label.classList.add('vidiReveal');
    label.style.setProperty('--reveal-steps',String(label.textContent.length));
    label.style.setProperty('--reveal-duration',Math.min(1400,Math.max(450,label.textContent.length*35))+'ms');
   }
  }
  button.onclick=()=>{clearAnswerFeedback();answerTargetSlot=null;selectedTeamSlot=selectedTeamSlot===slot?null:slot;drawSquad();drawClubTitle();focusSelectedAnswer();};board.append(button);
 });revealTeamSlot=null;updateTeamHint();requestAnimationFrame(fitTeamRows);
};
drawClubTitle=function(){
 const board=document.getElementById('clubTitle');board.replaceChildren();
 clubPool.forEach(club=>{
  const code=club.clubCode.slice(0,3),usage=clubUsage[code]||0,season=club.season.replace(/^\d{2}(\d{2}-\d{2})$/,'$1');
  const button=selectionRow('clubPick',club.club+' '+season+(usage>0?' ('+usage+')':''));
  button.dataset.club=code;
  button.setAttribute('aria-pressed',String(selectedTeamClub===code));button.disabled=currentGame.gameOver;
  button.style.color=usage?feedbackTierColours[getClubTier(code)]:'#ffffff';
  if(code===lastClubCode)button.classList.add('latestAnswer');
  button.onclick=()=>{clearAnswerFeedback();answerTargetSlot=null;selectedTeamClub=selectedTeamClub===code?null:code;drawClubTitle();drawSquad();focusSelectedAnswer();};board.append(button);
 });requestAnimationFrame(fitTeamRows);
};
new ResizeObserver(fitTeamRows).observe(document.querySelector('.mainLayout'));
document.fonts.ready.then(fitTeamRows);
if(clubPool.length)refreshScreen();else updateTeamHint();
