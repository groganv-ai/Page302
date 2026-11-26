const fs=require('node:fs');
// Use the saved inspection of the historical workbook; never alter game packs.
const source='outputs/historical-club-list/Historical Premier League Club list - completed.xlsx.inspect.ndjson';
const table=fs.readFileSync(source,'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse).find(x=>x.kind==='table'&&x.sheet==='All Teams');
const ranks={},names={};
for(const row of table.values.slice(1)){
 const [season,code,rank,,,clubCode]=row;
 if(!/^\d{4}-\d{2}$/.test(season)||!/^\d{4}$/.test(code)||!Number.isInteger(rank)||rank<1||rank>22)throw Error('Invalid historical standing');
 const key=clubCode+code;
 if(key in ranks)throw Error('Duplicate historical standing: '+key);
 ranks[key]=rank;names[clubCode]=row[4];
}
fs.writeFileSync('club-sort-data.js','// Generated from the historical club workbook inspection. See docs/core-review/05-club-sorting.md.\nwindow.PAGE302_CLUB_SORT_DATA='+JSON.stringify({ranks,names})+';\n');
console.log('Prepared '+Object.keys(ranks).length+' historical club-season ranks.');
