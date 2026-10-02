const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'script.js'), 'utf8')
    .replace(/document\s*\.getElementById\("answer"\)\s*\.addEventListener[\s\S]*$/, '');
const context = vm.createContext({ console });
vm.runInContext(source, context);
function pool(clubs) {
    context.testClubs = clubs;
    vm.runInContext('clubPool = testClubs', context);
}
function names(answer, position, club) {
    return Array.from(context.findPlayers(answer, position, club), player => player.fullname);
}
let checked = 0;
for (const number of ['001', '002', '003']) {
    const pack = JSON.parse(fs.readFileSync(path.join(root, `data/vggfax${number}.json`), 'utf8'));
    pool(pack.clubs);
    for (const club of pack.clubs) for (const person of club.squad) {
        const surname = context.normalizeSearchName(person.surname);
        for (const position of person.positions) {
            assert.ok(names(person.surname.toUpperCase(), position, club.clubCode.slice(0, 3)).includes(person.fullname), `${number}: uppercase ${person.fullname}`);
            assert.ok(names(surname.split('').join(' '), position, club.clubCode.slice(0, 3)).includes(person.fullname));
            if (surname.length < 5) continue;
            const typos = [surname.slice(1), 'x' + surname, 'x' + surname.slice(1)];
            const swap = [...surname].findIndex((letter, i) => i + 1 < surname.length && letter !== surname[i + 1]);
            if (swap >= 0) typos.push(surname.slice(0, swap) + surname[swap + 1] + surname[swap] + surname.slice(swap + 2));
            for (const typo of typos) {
                if (typo === surname || context.playerExistsAtClub(typo, club.clubCode.slice(0, 3))) continue;
                assert.ok(names(typo, position, club.clubCode.slice(0, 3)).includes(person.fullname), `${number}: ${typo} => ${person.fullname}`);
                checked++;
            }
        }
    }
}
pool([{ clubCode: 'AAA0001', squad: [
    { fullname: 'Alex Stone', surname: 'Stone', positions: ['DF'] },
    { fullname: 'Ben Stowe', surname: 'Stowe', positions: ['AT'] },
    { fullname: 'Chris Stole', surname: 'Stole', positions: ['AT'] },
    { fullname: 'Dan Son', surname: 'Son', positions: ['AT'] },
    { fullname: 'Eli O’Shea', surname: 'O’Shea', positions: ['MD'] },
    { fullname: 'Fran Oshea', surname: 'Oshea', positions: ['MD'] }
] }]);
assert.deepEqual(names('Stone', 'AT', 'AAA'), []);
assert.equal(context.playerExistsAtClub('S T O N E', 'AAA'), true);
assert.deepEqual(names('Stove', 'AT', 'AAA'), ['Ben Stowe', 'Chris Stole']);
assert.deepEqual(names('So', 'AT', 'AAA'), []);
assert.deepEqual(names('Son', 'AT', 'AAA'), ['Dan Son']);
assert.deepEqual(names('O-SHEA', 'MD', 'AAA'), ['Eli O’Shea', 'Fran Oshea']);
assert.deepEqual(names('Stowe', 'AT', 'AAB'), []);
assert.deepEqual(names('Stowe', 'AX', 'AAA'), []);
assert.deepEqual(names('Ben Stowe', 'AT', 'AAA'), []);
assert.deepEqual(names('Sto', 'AT', 'AAA'), []);
assert.equal(context.isOneLetterTypo('ronlado', 'ronaldo'), true);
assert.equal(context.isOneLetterTypo('rnldo', 'ronaldo'), false);
assert.equal(context.normalizePersonName('Vidić'), 'vidić');
console.log(`Fuzzy search passed across all three packs (${checked} typo checks), including short names, exact precedence and ambiguity.`);
