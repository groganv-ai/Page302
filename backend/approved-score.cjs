const {ServiceError} = require('./validation.cjs');

const identity = name => name.normalize('NFKC').trim().toLocaleLowerCase('en-GB');
const isManager = record => record.positions.includes('MAN');
const eligible = record => Number.isInteger(record.appearances) && record.appearances > 0 &&
  !(isManager(record) && record.status === 'caretaker');
const rarity = appearances => appearances === 1 ? 'UNI' : appearances <= 9 ? 'SUB' :
  appearances <= 15 ? 'UTL' : appearances <= 29 ? 'ENG' : 'LEG';
const reject = () => { throw new ServiceError(422, 'Score could not be verified against the approved pack.'); };

// Answers arrive in squad-slot order, not pick order. clubs[0] identifies the
// selected club before normalize() sorts that list. Check each club's complete
// sequence of tiers instead of assuming that slot order is selection order.
function verifyApprovedScore(data, input, pack) {
  if (!pack || !Array.isArray(pack.clubs) || !pack.clubs.length) {
    throw new ServiceError(503, 'Approved scoring data is unavailable.');
  }
  const points = Number(data.packId) >= 9
    ? {UNI:200, SUB:100, UTL:75, ENG:45, LEG:25}
    : {UNI:100, SUB:80, UTL:60, ENG:40, LEG:20};
  const people = new Set(), tiers = new Map();
  let total = 0;
  for (let index = 0; index < data.answers.length; index++) {
    const answer = data.answers[index], name = identity(answer.name), manager = answer.position === 'MAN';
    if (people.has(name) || answer.personId !== (manager ? 'manager:' : 'player:') + name) reject();
    people.add(name);
    const links = [];
    for (const club of pack.clubs) {
      const record = club.squad.find(record => eligible(record) &&
        identity(record.fullname) === name && isManager(record) === manager);
      if (record) links.push({code:club.clubCode.slice(0,3), record});
    }
    const selectedCode = input.answers[index].clubs[0];
    const selected = links.find(link => link.code === selectedCode)?.record;
    if (!selected || selected.fullname !== answer.name || !selected.positions.includes(answer.position)) reject();
    const clubs = links.map(link => link.code).sort();
    if (JSON.stringify(answer.clubs) !== JSON.stringify(clubs) || answer.rarity !== rarity(selected.appearances)) reject();
    if (manager) {
      if (answer.clubTier !== null) reject();
    } else {
      if (!Number.isInteger(answer.clubTier) || answer.clubTier < 1 || answer.clubTier > 5) reject();
      if (!tiers.has(selectedCode)) tiers.set(selectedCode, []);
      tiers.get(selectedCode).push(answer.clubTier);
    }
    const multiplier = manager ? links.length : [0,13,8,5,3,1][answer.clubTier];
    const expected = links.map(link => ({recordId:link.record.id,
      points:points[rarity(manager ? link.record.appearances : selected.appearances)] * multiplier}));
    const sort = values => values.slice().sort((a,b) => a.recordId.localeCompare(b.recordId));
    if (JSON.stringify(sort(answer.contributions)) !== JSON.stringify(sort(expected))) reject();
    total += expected.reduce((sum, contribution) => sum + contribution.points, 0);
  }
  for (const values of tiers.values()) {
    values.sort((a,b) => a-b);
    if (values.some((tier,index) => tier !== Math.min(index + 1, 5))) reject();
  }
  if (!Number.isSafeInteger(total) || data.score !== total) reject();
  return total;
}

module.exports = {verifyApprovedScore};
