/* Presentation only: never sort or annotate the authoritative clubPool. */
const clubSortState={mode:'default',descending:false};
function clubSeasonYear(club){
 const match=String(club.season).match(/^(\d{4})-\d{2}$/);
 return match?Number(match[1]):null;
}
function clubSeasonRank(club){
 const year=clubSeasonYear(club);
 if(year===null)return null;
 const key=club.clubCode.slice(0,3)+String(year).slice(-2)+String(year+1).slice(-2);
 return window.PAGE302_CLUB_SORT_DATA?.ranks[key]??null;
}
function sortedClubView(clubs,mode=clubSortState.mode,descending=clubSortState.descending){
 const value=club=>mode==='rank'?clubSeasonRank(club):mode==='year'?clubSeasonYear(club):
  (window.PAGE302_CLUB_SORT_DATA?.names[club.clubCode.slice(0,3)]||club.club);
 if(mode==='default')return clubs.slice();
 return clubs.map((club,index)=>({club,index,value:value(club)})).sort((a,b)=>{
  if(a.value===null||b.value===null)return a.value===b.value?a.index-b.index:a.value===null?1:-1;
  const comparison=mode==='alphabetical'?a.value.localeCompare(b.value,'en'):a.value-b.value;
  return comparison*(descending?-1:1)||a.index-b.index;
 }).map(item=>item.club);
}
const clubSortModes=['default','alphabetical','rank','year'];
const clubSortHeader=document.getElementById('clubTitle').closest('.panel').querySelector('.panelHeader');
clubSortHeader.classList.add('clubSortHeader');
const clubSortHeading=document.createElement('span');
clubSortHeading.setAttribute('role','status');
const clubSortButton=document.createElement('button');
clubSortButton.type='button';clubSortButton.className='clubSortToggle';
clubSortButton.setAttribute('aria-controls','clubTitle');
clubSortButton.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 4h18v3l-7 7v6l-4-2v-4L3 7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="miter"/></svg>';
clubSortButton.onclick=()=>{
 clubSortState.mode=clubSortModes[(clubSortModes.indexOf(clubSortState.mode)+1)%clubSortModes.length];
 clubSortState.descending=false;
 drawClubTitle();
};
clubSortHeader.replaceChildren(clubSortHeading,clubSortButton);
function updateClubSortControls(){
 const mode=clubSortState.mode;
 const suffix={default:'',alphabetical:' (A/Z)',rank:' (#1)',year:' (yrs)'};
 const names={default:'DEFAULT PACK ORDER',alphabetical:'ALPHABETICAL A TO Z',rank:'LEAGUE FINISHING POSITION, BEST FIRST',year:'YEAR, OLDEST FIRST'};
 const next=clubSortModes[(clubSortModes.indexOf(mode)+1)%clubSortModes.length];
 clubSortHeading.textContent='CLUBS'+suffix[mode];
 const missing=clubPool.filter(club=>clubSeasonRank(club)===null).length;
 const label='FILTER CLUBS: '+names[mode]+'. NEXT: '+names[next]+(mode==='rank'&&missing?'. '+missing+' RANK UNAVAILABLE, SHOWN LAST':'');
 clubSortButton.setAttribute('aria-label',label);clubSortButton.title=label;
}
