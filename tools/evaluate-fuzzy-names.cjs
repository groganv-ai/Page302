// Reproducible synthetic evaluation, not a measurement of real user intent.
const fs=require('node:fs'),path=require('node:path'),f=require('../fuzzy-names.js');
const root=path.resolve(__dirname,'..'),rows={},falseReveals=[],adversarial=[];
const bucket=n=>n<6?'1-5':n<9?'6-8':n<13?'9-12':'13+';
for(const pack of ['001','002','003','004','005','006','007']){
 const data=JSON.parse(fs.readFileSync(path.join(root,'data/vggfax'+pack+'.json')));
 for(const club of data.clubs){
  const records=club.squad.filter(p=>p.appearances>0&&!p.positions.includes('MAN')),index=f.index(records);
  for(const target of index){
   const b=bucket(target.key.length),r=rows[b]??={cases:0,suggestions:0,correct:0,ambiguous:0,wrongPositionLeaks:0};
   const pos=[...target.positions][0];
   for(let count=1;count<=4;count++)for(let variant=0;variant<4;variant++){
    let chars=Array.from(target.key);
    for(let k=0;k<count;k++){
     const i=(variant+k*3)%chars.length;
     if(variant===0)chars[i]=chars[i]==='z'?'x':'z';
     else if(variant===1)chars.splice(i,0,'q');
     else if(variant===2)chars.splice(i,1);
     else if(i+1<chars.length)[chars[i],chars[i+1]]=[chars[i+1],chars[i]];
    }
    const input=chars.join('');
    // Evaluate only the wider stage: exact and one-edit inputs belong to the preceding validator.
    if(index.some(c=>f.distance(input,c.key)<2))continue;
    r.cases++;const out=f.rank(input,index,pos);if(out.ambiguous)r.ambiguous++;
    if(out.kind==='confident_same_position'){
     r.suggestions++;if(f.normalize(out.surname)===target.key)r.correct++;
     else falseReveals.push({pack,club:club.clubCode,input,expected:target.surname,actual:out.surname});
    }
    const other=['GK','DF','MD','AT'].find(p=>!target.positions.has(p));
    if(other){const wrong=f.rank(input,index,other);if(wrong.kind==='confident_other_position'&&Object.keys(wrong).length!==1)r.wrongPositionLeaks++;}
   }
   for(const input of [target.key.slice(0,-2),...target.surname.split(/[- ]/),'smith','jones','zzzzzzzz','qwertyuiop']){
    if(index.some(c=>f.distance(f.normalize(input),c.key)<2))continue;
    const out=f.rank(input,index,pos);if(out.kind==='confident_same_position')adversarial.push({pack,club:club.clubCode,input,actual:out.surname});
   }
  }
 }
}
for(const r of Object.values(rows)){r.precision=r.suggestions?r.correct/r.suggestions:null;r.recall=r.correct/r.cases;}
const report={note:'Wider-stage synthetic evaluation; variants filtered when exact/one-edit precedence applies. Recall denominator is remaining generated typo cases. No real user data. Adversarial hits require manual review.',config:f.config,rows,falseReveals,adversarial};
fs.mkdirSync(path.join(root,'outputs/fuzzy-review'),{recursive:true});fs.writeFileSync(path.join(root,'outputs/fuzzy-review/evaluation.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({rows,falseReveals:falseReveals.length,adversarial:adversarial.length},null,2));
