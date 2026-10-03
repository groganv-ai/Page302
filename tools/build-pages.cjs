const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const output = path.join(root, '.pages-dist');
const files = [
  'index.html', 'script.js', 'style.css',
  'scores-client.js', 'scores.css', 'results-client.js', 'results.css',
  'assets/page302-logo.png', 'assets/vince-teletext-host.png',
  'fonts/EuropeanTeletextNuevo.ttf'
];

// Publish explicit website assets and JSON packs, never the whole repository.
function addData(directory) {
  for (const entry of fs.readdirSync(path.join(root, directory), {withFileTypes: true})) {
    const relative = directory + '/' + entry.name;
    if (entry.isSymbolicLink()) throw new Error('Data symlink is not permitted: ' + relative);
    if (entry.isDirectory()) addData(relative);
    else if (entry.isFile() && entry.name.endsWith('.json')) files.push(relative);
  }
}
addData('data');

// Check source files before replacing the generated output.
for (const relative of files) {
  const source = path.join(root, relative);
  if (!fs.lstatSync(source).isFile()) throw new Error('Missing website file: ' + relative);
  if (relative.endsWith('.json')) JSON.parse(fs.readFileSync(source, 'utf8'));
}
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'data/vggfax-manifest.json'), 'utf8'));
if (!Array.isArray(manifest.packs) || !manifest.packs.length) throw new Error('Missing pack manifest entries');
for (const entry of manifest.packs) {
  const number = typeof entry === 'string' ? entry : entry.packNumber;
  if (!/^\d{3}$/.test(number) || !files.includes('data/vggfax' + number + '.json')) {
    throw new Error('Manifest pack is unavailable: ' + number);
  }
}

fs.rmSync(output, {recursive: true, force: true});
for (const relative of files) {
  const destination = path.join(output, relative);
  fs.mkdirSync(path.dirname(destination), {recursive: true});
  fs.copyFileSync(path.join(root, relative), destination);
}
fs.writeFileSync(path.join(output, '.nojekyll'), '');
console.log('Prepared ' + (files.length + 1) + ' website files in .pages-dist.');
console.log('Backend, spreadsheets, working documents, tests and tools are excluded.');
