let answerBallFlashTimer;
function flashAnswerBall(icon,colour){
 clearTimeout(answerBallFlashTimer);
 const coloured='data:image/svg+xml,'+encodeURIComponent("<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 20 20\" shape-rendering=\"crispEdges\"><path fill=\"white\" d=\"M6 0h8v1h3v2h2v3h1v8h-1v3h-2v2h-3v1H6v-1H3v-2H1v-3H0V6h1V3h2V1h3z\"/><g fill=\"black\"><path d=\"M8 6h4v1h2v4h-1v2H7v-2H6V7h2zM5 2h3v2H6v1H4V3h1zM14 3h2v1h1v2h-3zM16 10h2v3h-1v2h-2v-3h1zM10 16h3v2H9v-1h1zM2 9h2v1h1v3H2z\"/></g></svg>".replace('fill="white"','fill="'+colour+'"'));
 let step=0;
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 function tick(){
  icon.src=step%2===0?coloured:'assets/ball.svg';step++;
  if(step>=(reduced?1:4)){
   answerBallFlashTimer=setTimeout(()=>{icon.src='assets/ball.svg';},reduced?600:250);
  }else answerBallFlashTimer=setTimeout(tick,250);
 }
 tick();
}
/* Presentation reads the engine's accepted answer; it never calculates game points. */
const fullRarityNames = {UNI:'UNICORN',SUB:'SUBSTITUTE',UTL:'UTILITY PLAYER',ENG:'ENGINE ROOM',LEG:'LEGEND'};
const feedbackTierColours = ['#ffffff','#ff00ff','#00ffff','#00ff00','#ffff00','#ffffff'];
const feedbackRarityColours = {UNI:'#ff00ff',SUB:'#00ffff',UTL:'#00ff00',ENG:'#ffff00',LEG:'#ffffff'};
function playerPointsColour(points) {
    return points>=1040?'#ff00ff':points>=780?'#00ffff':points>=520?'#00ff00':points>260?'#ffff00':'#ffffff';
}
function managerPointsColour(points) {
    return points>=100?'#ff00ff':points>=80?'#00ffff':points>=60?'#00ff00':points>=40?'#ffff00':'#ffffff';
}
function feedbackNode(tag, text, className) {
    const node=document.createElement(tag);
    if(text!==undefined)node.textContent=text;
    if(className)node.className=className;
    return node;
}
function showAcceptedAnswer() {
    const answer=squadDisplay[lastSquadIndex];
    if(!answer)return;
    const box=document.getElementById('lastAnswer');
    const ball=feedbackNode('img',undefined,'feedbackBall hop');
    ball.src='assets/ball.svg';ball.alt='';
    const body=feedbackNode('div');
    body.append(feedbackNode('div',lastPlayer.toUpperCase(),'playerName'));
    // Only the submitted club increments player usage; linked clubs remain separate.
    answer.clubs.forEach(code=>{
        const club=getClubByCode(code);
        const submitted=code===lastClubCode;
        const suffix=answer.isManager?' · MANAGER':submitted?' ('+clubUsage[code]+') x'+getClubMultiplier(answer.clubTier):' · BONUS';
        const season=club?String(club.season).replace(/\b\d{2}(\d{2})(?=\s*[-–/])/,'$1').replace(/([-–/]\s*)\d{2}(\d{2})\b/,'$1$2'):'';
        const line=feedbackNode('div',(club?club.club.toUpperCase()+' '+season:code)+suffix,'feedbackClub');
        line.style.color=answer.isManager?'#ffffff':feedbackTierColours[submitted?answer.clubTier:getClubTier(code)];
        body.append(line);
    });
    const submittedRecord=findLinkedRecords(answer.name,answer.isManager).find(link=>link.clubCode===lastClubCode);
    const basePoints=submittedRecord?getRarity(submittedRecord.record).points:null;
    const rarity=feedbackNode('div',fullRarityNames[answer.rarity]+(basePoints===null?'':' +'+basePoints),'feedbackRarity');
    rarity.style.color=feedbackRarityColours[answer.rarity];
    body.insertBefore(rarity,body.children[1]||null);
    const total=feedbackNode('div','+'+answer.score.toLocaleString('en-GB')+' POINTS','feedbackPoints');
    total.style.color=answer.isManager?managerPointsColour(answer.score):playerPointsColour(answer.score);
    body.append(total);
    ball.classList.remove('hop');
    flashAnswerBall(ball,answer.isManager?managerPointsColour(answer.score):playerPointsColour(answer.score));
    box.replaceChildren(ball,body);box.hidden=false;
}
const statusBeforeV4=setStatus;
setStatus=function(text,correct=false) {
    statusBeforeV4(text,correct);
    const box=document.getElementById('lastAnswer');
    const instruction=/^ENTER ANSWER AS|^SELECT A TEAM > SELECT A POSITION > ENTER A SURNAME$/.test(text);
    const presented=correct||!instruction;
    document.getElementById('result').classList.toggle('feedbackPresented',presented);
    box.hidden=!presented;
    if(correct){showAcceptedAnswer();return;}
    if(!presented)return;
    const retry=/TRY|FORMAT:|ENTER A PLAYER|ENTER A SURNAME|SELECT A TEAM|SELECT A POSITION|DID YOU MEAN|SELECTION CANCELLED/.test(text);
    const ball=feedbackNode('img',undefined,'feedbackBall hop');
    ball.src=retry?'assets/ball-yellow.svg':'assets/ball-red.svg';ball.alt='';
    const body=feedbackNode('div');
    const lines=text.split(/\s+-\s+|\n+/).filter(Boolean);
    lines.forEach((line,index)=>{
        const submittedAnswer=lines.length>1&&index===0;
        const message=feedbackNode('div',line,submittedAnswer?'playerName':'feedbackMessage');
        message.style.color=submittedAnswer?'#ffffff':retry?'#ffff00':'#ff0000';
        body.append(message);
    });
    box.replaceChildren(ball,body);
};
