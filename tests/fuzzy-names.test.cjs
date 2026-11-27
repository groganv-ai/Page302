const {test}=require('node:test'),assert=require('node:assert/strict');
const f=require('../fuzzy-names.js');
const p=(surname,positions=['MD'])=>({surname,positions});
test('distance, canonical normalization and conservative thresholds',()=>{
 assert.equal(f.distance('ca','abc'),2);assert.equal(f.distance('neville','nevilel'),1);
 assert.equal(f.normalize('  GÍLBERTO—SILVA ’'),'gilbertosilva');
 const index=f.index([p('Ljungberg'),p('Neville',['DF']),p('Neville',['DF'])]);
 assert.deepEqual(f.rank('Ljunburg',index,'MD'),{kind:'confident_same_position',surname:'Ljungberg'});
 assert.deepEqual(f.rank('Ljunburg',index,'DF'),{kind:'confident_other_position'});
 assert.equal(index.length,2);
 for(const input of ['nev','neville','nevill','ljung','smith','zzzzzzzz'])assert.equal(f.rank(input,index,'MD').kind,'none');
 assert.equal(f.rank('abcdef',f.index([p('abxdyf'),p('abcxyz')]),'MD').kind,'none');
 for(const surname of ['Wright-Phillips','Walker Peters','Gilberto Silva']){
  for(const fragment of surname.split(/[- ]/))assert.equal(f.rank(fragment,f.index([p(surname)]),'MD').kind,'none');
 }
 for(const pos of ['GK','DF','MD','AT'])assert.equal(f.rank('Ljunburg',f.index([p('Ljungberg',[pos])]),pos).kind,'confident_same_position');
});
