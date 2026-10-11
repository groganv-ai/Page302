(() => {
 const overlay = document.getElementById('reportOverlay');
 const form = document.getElementById('reportForm');
 const type = document.getElementById('reportType');
 const status = document.getElementById('reportStatus');
 const send = document.getElementById('reportSend');
 let source = 'about', previousFocus, busy = false, context;
 function updateFields() {
  document.getElementById('reportCategoryText').textContent = type.selectedOptions[0].textContent;
  document.getElementById('reportPlayerFields').hidden = !['data','name'].includes(type.value);
  document.getElementById('reportAliasField').hidden = type.value !== 'name';
  for (const input of document.querySelectorAll('#reportPlayerFields input')) {
   input.disabled = input.closest('[hidden]') !== null;
  }
 }
 window.showReport = function(from = 'about') {
  source = from; previousFocus = document.activeElement;
  hideHelp(); hideAbout();
  context = {build: APP_BUILD, pack: currentVggfax};
  document.getElementById('reportContext').textContent = `Included automatically: ${context.build} · Game pack ${context.pack}`;
  overlay.hidden = false;
  type.focus();
 };
 window.hideReport = function(to = source) {
  overlay.hidden = true;
  if(to === 'help') showHelp();
  if(to === 'about') showAbout();
  if(to === source && previousFocus?.isConnected) previousFocus.focus();
 };
 type.addEventListener('change', updateFields);
 document.addEventListener('keydown', event => {
  if(overlay.hidden) return;
  if(event.key === 'Escape') {event.preventDefault();hideReport();return;}
  if(event.key !== 'Tab') return;
  const controls = [...overlay.querySelectorAll('button,input,select,textarea,a[href]')].filter(el => !el.disabled && el.tabIndex >= 0 && el.getClientRects().length);
  const first=controls[0], last=controls.at(-1);
  if(!overlay.contains(document.activeElement)) {event.preventDefault();first.focus();}
  else if(event.shiftKey && document.activeElement===first) {event.preventDefault();last.focus();}
  else if(!event.shiftKey && document.activeElement===last) {event.preventDefault();first.focus();}
 });
 form.addEventListener('submit', async event => {
  event.preventDefault(); if(busy) return;
  if(!form.description.value.trim()) {status.textContent='Please describe the issue.';form.description.focus();return;}
  const payload = {...Object.fromEntries(new FormData(form)), ...context};
  busy=true;send.disabled=true;status.textContent='Sending report...';status.classList.remove('reportError');
  try {
   const base = window.PAGE302_REPORTS_API ?? window.PAGE302_SCORES_API ?? '';
   const response = await fetch(base.replace(/\/$/,'')+'/api/reports', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(25000)});
   const result = await response.json();
   if(!response.ok) throw new Error(result.error || 'Report could not be sent. Please try again.');
   form.reset();updateFields();status.textContent='Thank you — your report has been sent.';
  } catch(error) {
   status.classList.add('reportError');
   status.textContent = error.name==='TimeoutError' || error instanceof TypeError ? 'Delivery could not be confirmed. Your report is kept here. Please wait before trying again.' : error.message;
  } finally {busy=false;send.disabled=false;}
 });
 updateFields();
})();
