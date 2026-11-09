"""Export the combined and individual JSON pack answers as matching CSV files."""
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HEADER = ['pack', 'clubCode', 'club', 'season', 'id', 'fullname', 'surname', 'positions', 'appearances', 'playerId', 'aliases']


def write(path, rows):
    with path.open('w', encoding='utf-8-sig', newline='') as stream:
        writer = csv.writer(stream)
        writer.writerow(HEADER)
        writer.writerows(rows)
    with path.open(encoding='utf-8-sig', newline='') as stream:
        assert list(csv.reader(stream))[1:] == [[str(v) for v in row] for row in rows]


for n in range(1, 8):
    pack = f'{n:03}'
    data = json.loads((ROOT / f'data/vggfax{pack}.json').read_text(encoding='utf-8'))
    rows = []
    for club in data['clubs']:
        club_rows = [[pack, club['clubCode'], club['club'], club['season'], p['id'], p['fullname'], p['surname'], '|'.join(p['positions']), p['appearances'], p.get('playerId', ''), '|'.join(p.get('aliases', []))] for p in club['squad']]
        write(ROOT / f"data/vggfax{pack}/{club['clubCode'].lower()}.csv", club_rows)
        rows.extend(club_rows)
    write(ROOT / f'data/vggfax{pack}.csv', rows)
print('Verified CSV parity for all seven combined and 77 individual pack exports.')
