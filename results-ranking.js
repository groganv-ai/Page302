// Read-only projections of published results; stored scores and snapshots stay unchanged.
function rankPublishedResults(results, method = 'score', direction = method === 'score' ? 'highest' : 'lowest') {
 const value = row => (direction === 'highest' ? -1 : 1) * (method === 'rarity' ? row.rarityScore : row.score);
 const sorted = results.slice().sort((a,b) => value(a)-value(b) || a.guesses-b.guesses);
 let rank = 0;
 return sorted.map((row,index) => {
  if (!index || value(row)!==value(sorted[index-1]) || row.guesses!==sorted[index-1].guesses) rank=index+1;
  return {...row, rank};
 });
}
function rarestPublishedAnswers(results) {
 const counts = new Map();
 for (const row of results) {
  const seen = new Set();
  for (const answer of row.answers) {
   if (answer.position==='MAN' || seen.has(answer.personId)) continue;
   seen.add(answer.personId);
   const entry = counts.get(answer.personId) || {personId:answer.personId,name:answer.name,count:0};
   entry.count++; counts.set(answer.personId,entry);
  }
 }
 const minimum = Math.min(...Array.from(counts.values(), answer=>answer.count));
 return Array.from(counts.values()).filter(answer=>answer.count===minimum)
  .sort((a,b)=>a.name.localeCompare(b.name))
  .map(answer=>({...answer,total:results.length,percentage:answer.count/results.length*100}));
}
if (typeof module !== 'undefined') module.exports={rankPublishedResults,rarestPublishedAnswers};
