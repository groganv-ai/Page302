const {ScoreStore}=require('./store.cjs');
const {readFileSync}=require('node:fs');
const store=new ScoreStore(process.env.PAGE302_DB||'backend/local.sqlite');
try {
  const [command,value]=process.argv.slice(2);
  if(command==='add-pack') store.addPack(JSON.parse(readFileSync(value,'utf8')));
  else if(command==='finalize') console.log(JSON.stringify(store.finalize(value),null,2));
  else throw new Error('Usage: node backend/admin.cjs add-pack <file.json> | finalize <pack>');
}finally{store.close();}
