/* Confirm player-requested resets before changing any game or submission state. */
(() => {
 const dialog=document.createElement('dialog');
 dialog.id='newGameDialog';
 dialog.setAttribute('aria-labelledby','newGameTitle');
 dialog.setAttribute('aria-describedby','newGameMessage');
 dialog.innerHTML='<div class="completeHeading"><h2 id="newGameTitle" class="completeTitle">NEW GAME</h2><button type="button" class="completeDismiss" aria-label="Cancel new game">×</button></div><p id="newGameMessage"></p><div class="newGameActions"><button type="button" id="cancelNewGame">CANCEL</button><button type="button" id="confirmNewGame">START NEW GAME</button></div>';
 document.body.append(dialog);
 const cancel=dialog.querySelector('#cancelNewGame'),confirm=dialog.querySelector('#confirmNewGame');
 let resolveChoice=null,previousFocus=null;
 function finish(accepted){
  if(!resolveChoice)return;
  const resolve=resolveChoice;resolveChoice=null;dialog.close();
  if(!accepted&&previousFocus?.isConnected)previousFocus.focus({preventScroll:true});
  resolve(accepted);
 }
 cancel.onclick=()=>finish(false);
 confirm.onclick=()=>finish(true);
 dialog.querySelector('.completeDismiss').onclick=()=>finish(false);
 dialog.addEventListener('cancel',event=>{event.preventDefault();finish(false);});
 function ask(){
  previousFocus=document.activeElement;
  const ended=currentGame.gameOver||gameComplete;
  const submitted=!!scoreAttempt?.saved;
  const warning=ended&&!submitted?
   'Your previous results have not been submitted and your score will be reset!':
   !ended&&(currentGame.totalGuesses>0||Object.keys(squadDisplay).length>0)?
   'Your current score will be reset!':'';
  const message=dialog.querySelector('#newGameMessage');
  message.replaceChildren(document.createTextNode('Are you sure you want to start a new game?'));
  if(warning){
   const line=document.createElement('strong');line.className='newGameWarning';line.textContent=warning;
   message.append(document.createTextNode(' '),line);
  }
  return new Promise(resolve=>{resolveChoice=resolve;dialog.showModal();cancel.focus();});
 }
 const start=newGame;
 let requesting=false;
 newGame=async function(options={}){
  if(options.quiet)return start.call(this,options);
  if(requesting)return;
  requesting=true;
  try{if(await ask())return await start.call(this,{...options,quiet:true});}
  finally{requesting=false;}
 };
})();
