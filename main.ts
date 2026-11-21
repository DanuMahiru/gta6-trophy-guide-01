// Vice City Trophy Atlas — the gta6-trophy-guide-01 entry (Node 22, standard library only).
// The guide itself is the static app/ folder next to this file: index.html plus
// CSS and plain JS, no build step, and it loads nothing over the network — the
// trophy data is app/data/trophies.json, read from disk by the browser. This
// program is only the hand-in: it copies app/ and screenshots/ into /output
// and writes /output/dossier.json, the summary the judge reads (screenshots,
// the first load's files and bytes, and the source), using the vendored
// make.fun library. vendor/makefun-frontend.ts must stay untouched: the scorer
// requires dossier.json to be byte for byte what its own copy writes.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// v2 gate self-check: every one of the 55 trophies must carry a non-blank
// guide, or the entry earns no judge score. Fail the hand-in loudly here
// instead of shipping a gate-failing dossier.
const trophyData = JSON.parse(readFileSync(join(here, 'app', 'data', 'trophies.json'), 'utf8'));
if (!Array.isArray(trophyData.trophies) || trophyData.trophies.length !== 55) throw new Error('trophies.json must list exactly 55 trophies');
for (const t of trophyData.trophies) {
  if (typeof t.guide !== 'string' || !t.guide.trim()) throw new Error(`trophy ${t.id} (${t.name}) has no guide`);
}

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the
// bytes; the others refuse an entry the scorer would refuse (more than 4
// screenshots or one over 256 KiB; more than 993 files and directories in app/
// or 48 MiB of app files: app/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 }),
);
