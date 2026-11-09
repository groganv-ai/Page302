// D1-compatible binding for running the identical scheduler against local SQLite.
function sqliteBinding(sqlite) {
 return {prepare(sql){return {bind(...values){return {sql,values,
  async first(){return sqlite.prepare(sql).get(...values)||null},
  async all(){return {results:sqlite.prepare(sql).all(...values)}},
  async run(){return sqlite.prepare(sql).run(...values)}
 }}}},async batch(statements){
  sqlite.exec('BEGIN IMMEDIATE');
  try {const result=statements.map(s=>sqlite.prepare(s.sql).run(...s.values));sqlite.exec('COMMIT');return result}
  catch(error){sqlite.exec('ROLLBACK');throw error}
 }};
}
module.exports={sqliteBinding};
