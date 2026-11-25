# MLCars

A cartoon racing simulation where six small cars learn to drive round a track
by trial and error. Built for 16 to 19 year old FE students on NCFE Level 2,
BTec Level 3 and T-Level Level 3 programmes, to make trial-and-error machine
learning visible, step by step.

Client only app: React + Vite + JavaScript, no backend, no database.
Saving is local (`localStorage`) plus JSON export and import. See `BUILD.md`
for the full scope and `CLAUDE.md` for styling and process rules.

## Development

```
npm install
npm run dev
```

## Build

```
npm run build
```

Upload the contents of `dist/` to the web root. The root `.htaccess` handles
the client-side routing fallback and keeps `.config.json` (if one is ever
added) from being served.

## Status

Phase 0: scaffold complete, visual direction pending a nod. See `BUILD.md`
section 13 for the phase plan.

## Licence

Released under Creative Commons Attribution-NonCommercial-ShareAlike 4.0
International (CC BY-NC-SA 4.0). You may share and adapt this work with
credit, for non-commercial use only, and adaptations must carry the same
licence. Full terms: https://creativecommons.org/licenses/by-nc-sa/4.0/

![CC BY-NC-SA 4.0](public/cc-by-nc-sa.png)

Author and licence holder: Simon Rundell, Exeter College.
