const {test}=require('node:test');
const assert=require('node:assert/strict');
const {rankPublishedResults,rarestPublishedAnswers}=require('../results-ranking.js');
test('rank all published submissions before cutoff, using unrounded rarity and competition ties',()=>{
 const rows=Array.from({length:30},(_,i)=>({score:300-i,guesses:12,rarityScore:30-i,reference:String(i),answers:[]}));
 rows[29].rarityScore=1.001;rows[28].rarityScore=1.002;
 const original=JSON.stringify(rows);
 assert.equal(rankPublishedResults(rows,'rarity')[0].reference,'29');
 rows[27].rarityScore=1.002;
 const ranked=rankPublishedResults(rows,'rarity');
 assert.deepEqual(ranked.slice(0,4).map(r=>r.rank),[1,2,2,4]);
 rows[27].rarityScore=3;
 assert.equal(JSON.stringify(rows),original);
 rows[25].score=rows[24].score;
 assert.equal(rankPublishedResults(rows).filter(r=>r.rank<=25).length,26);
 rows[25].guesses=13;
 assert.equal(rankPublishedResults(rows).filter(r=>r.rank<=25).length,25);
});
test('award counts people once per squad, excludes managers and recognises all ties',()=>{
 const player={personId:'player-1',name:'One',position:'DF',contributions:[{},{}]};
 const rows=[{answers:[player,player,{personId:'manager',name:'Manager',position:'MAN'}]},
 {answers:[{...player,personId:'player-2',name:'Two'}]}];
 const original=JSON.stringify(rows);
 assert.deepEqual(rarestPublishedAnswers(rows).map(a=>[a.name,a.count,a.percentage]),[['One',1,50],['Two',1,50]]);
 assert.equal(JSON.stringify(rows),original);
 assert.deepEqual(rarestPublishedAnswers([]),[]);
});
