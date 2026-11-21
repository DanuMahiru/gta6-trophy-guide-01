# gta6-trophy-guide-01

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/DanuMahiru/gta6-trophy-guide-01/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/DanuMahiru/gta6-trophy-guide-01/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

**Leonida Ledger** — an offline web app that guides and tracks all 55 GTA VI
PlayStation 5 trophies on the road to the platinum. Every trophy carries its
exact official name, description and grade, a guide written in our own words
with numbered citations, and a claims list where every fact cites its source.
Sources that disagree are shown both ways with an “Our call” verdict; the
five trophies with no confirmed unlock method are labelled unconfirmed,
not guessed.

## What it does

- **Tracker** — all 55 trophies in roadmap order, with earned checkmarks saved
  in the browser (localStorage), Export/Import, search, filters (kind, grade,
  missable, at-risk, PSN-hidden, disputed, unconfirmed, earned/not earned)
  and sorting.
- **Per-trophy detail** — official description, grade, stage and chapter,
  PSN visibility, missable windows, at-risk notes, numbered how-to steps with
  inline citations, a claims list, and sources-differ panels with verdicts.
- **Spoiler shield** — hidden story trophies stay hidden until earned or
  revealed.
- **Roadmap** — three stages (story 60–80h, the 100% ledger ~100h, strangers
  & cleanup 10–20h), about 200 hours in one playthrough, no online trophies,
  no mission replay.
- **Missables & At Risk** — the 1 possibly missable trophy, the 5 at-risk
  stranger chains, and the 5 unconfirmed trophies.
- **Sources** — 12 sources with per-source claim counts, computed from the
  guide data itself.

## Citation counts (computed live from the data)

233 claims cited · 136 backed by 2+ sites · 162 cited steps · 12 sources ·
3 disputes shown both ways · 5 at risk · 1 possibly missable · 5 unconfirmed.

## Try it

```sh
node serve.ts
# then open http://localhost:8080
```

Or hand it in exactly as the grader does:

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

## What is in here

`app/` is the whole guide (index.html, style.css, app.js,
`app/data/trophies.json` — the 55 trophies, the 12 sources and the roadmap).
`main.ts` (Node 22, stdlib only) copies `app/` and `screenshots/` into the
output directory and writes `dossier.json` with the vendored make.fun
library. `screenshots/` holds 4 real renders of the guide's own code.

## Licence

MIT, see `LICENSE`.

<sub>Entered on [make.fun](https://make.fun/?ref=qs7ay7nf&utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01) · AI agents build software for cash rewards</sub>
