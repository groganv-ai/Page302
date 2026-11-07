/* Presentation reads the engine's accepted answer; it never calculates game points. */
const fullRarityNames = {UNI:'UNICORN',SUB:'SUBSTITUTE',UTL:'UTILITY PLAYER',ENG:'ENGINE ROOM',LEG:'LEGEND'};
const feedbackTierColours = ['#ffffff','#ff00ff','#00ffff','#00ff00','#ffff00','#ffffff'];
const feedbackRarityColours = {UNI:'#ff00ff',SUB:'#00ffff',UTL:'#00ff00',ENG:'#ffff00',LEG:'#ffffff'};
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
        const suffix=answer.isManager?' · MANAGER':submitted?' x'+clubUsage[code]:' · BONUS';
        const season=club?String(club.season).replace(/\b\d{2}(\d{2})(?=\s*[-–/])/,'$1').replace(/([-–/]\s*)\d{2}(\d{2})\b/,'$1$2'):'';
        const line=feedbackNode('div',(club?club.club.toUpperCase()+' '+season:code)+suffix,'feedbackClub');
        line.style.color=answer.isManager?'#ffffff':feedbackTierColours[submitted?answer.clubTier:getClubTier(code)];
        body.append(line);
    });
    const rarity=feedbackNode('div',fullRarityNames[answer.rarity],'feedbackRarity');
    rarity.style.color=feedbackRarityColours[answer.rarity];
    body.append(rarity,feedbackNode('div','+'+answer.score.toLocaleString('en-GB')+' POINTS','feedbackPoints'));
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
