/* Reopening is presentation only: keep the original submission and form state. */
(() => {
 const button=document.createElement('button');
 button.type='button';button.className='footerAbout footerResultToggle';
 document.querySelector('.footerBar .footerAbout').replaceWith(button);
 let showingResults=false;
 function setResultsMode(enabled){
  showingResults=enabled;
  button.id=enabled?'reopenResults':'footerAboutButton';
  button.textContent=enabled?'RESULTS':'ABOUT';
 }
 setResultsMode(false);
 let revision=0,checking=false;
 const completed=()=>currentGame.gameOver&&gameComplete&&!!scoreAttempt&&scoreAttempt.packId===currentVggfax;
 async function available(){
  if(!completed())return false;
  // Explicit offline previews have no daily schedule. Live games always recheck it.
  if(!window.PAGE302_RELEASES_ENABLED)return true;
  try{
   const state=await refreshReleaseState();
   return completed()&&state?.enabled===true&&state.currentPack===currentVggfax&&state.currentRevision===playedReleaseRevision;
  }catch{return false;}
 }
 async function update(){
  const request=++revision;
  if(!completed()){setResultsMode(false);return;}
  const allowed=await available();
  if(request===revision)setResultsMode(allowed);
 }
 button.addEventListener('click',async()=>{
  if(!showingResults){showAbout();return;}
  if(checking)return;
  checking=true;button.disabled=true;
  const attempt=scoreAttempt;
  try{
   if(await available()&&attempt===scoreAttempt){
    document.getElementById('gameCompleteOverlay').style.display='flex';
    document.querySelector('#gameCompleteOverlay .completeDismiss').focus({preventScroll:true});
   }else setResultsMode(false);
  }finally{checking=false;button.disabled=false;}
 });
 const finish=completeGame;
 completeGame=function(...args){const result=finish.apply(this,args);update();return result;};
 const close=closeCompleteGame;
 closeCompleteGame=function(...args){const result=close.apply(this,args);update();return result;};
 const start=newGame;
 newGame=async function(...args){++revision;setResultsMode(false);return start.apply(this,args);};
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)update();});
 setInterval(()=>{if(completed()&&!document.hidden)update();},30000);
})();
