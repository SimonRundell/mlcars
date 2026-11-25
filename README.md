# MLCars

A cartoon racing simulation where six small cars learn to drive round a
track by trial and error. Built for 16 to 19 year old FE students on
NCFE Level 2, BTEC Level 3 and T-Level Level 3 programmes, to make
machine learning ideas visible, step by step, instead of explained only
in words.

Six cars sit on a start grid and drive at once, each picking one of nine
moves (speed up / hold / slow down, combined with steer left / straight
/ right) every 0.2 seconds. A car stops where it is when it hits a wall
or another car. When every car has stopped, the round ends and the next
begins. Each car remembers the moves that got it furthest and replays
them, changing its mind a little earlier each time it keeps failing at
the same point. Over hundreds of rounds the cars get further, then
complete laps, then get quicker. Every decision, memory and crash is
explained live in drawers over the track.

Client-only app: React + Vite + JavaScript, no backend, no database.
Saving is local (`localStorage`), plus JSON export and import. See
`BUILD.md` for the full specification and `CLAUDE.md` for styling and
process rules; this file is the reference for running it and teaching
from it.

## Contents

- [Development](#development)
- [Build and deploy](#build-and-deploy)
- [How it works](#how-it-works)
- [Tracks](#tracks)
- [Settings](#settings)
- [Teaching notes](#teaching-notes)
- [Status](#status)
- [Licence](#licence)

## Development

```
npm install
npm run dev
```

Opens on Vite's dev server (default `localhost:5173`). If that port is
already in use, a dev instance is already running — use it rather than
starting a second one.

Useful scripts:

```
npm run dev              # start the Vite dev server
npm run build             # production build to dist/
npm run preview           # serve the production build locally
npm run doctor             # run react-doctor diagnostics
npm run validate:tracks    # check every track definition is valid
```

## Build and deploy

```
npm run build
```

Upload the contents of `dist/` to the web root. The root `.htaccess`
handles the client-side routing fallback (so a hard refresh on any
route still works) and blocks `.config.json` from ever being served,
in case a backend is added later. There is currently no backend, no
`/api`, and nothing server-side to configure.

## How it works

### Agent, environment, action, reward

Each car is the **agent**; the track, walls and other cars are the
**environment**. A car's **action** each step is one of nine moves, on
a 3×3 grid: throttle (accelerate / hold / brake) × steering (left /
straight / right). Its **reward** is simply distance travelled along
the track centreline, counted across laps — further is always better.

### Learning by rewind and backtrack (route cars, the default mode)

A car's full attempt from the start line to its crash is one **episode**
(a round). Each car keeps its own **lineage**: its best route so far,
how many steps before the crash point it currently rewinds to, and
which moves it has already tried at that point. Planning the next
round:

1. If the round beat the car's best distance, that route becomes the
   new best, and the rewind point resets to just before its end.
2. Otherwise, the car notes the failed move at the rewind point. Once
   it has tried all nine moves there, or failed enough times in a row
   (`patience`), it **backtracks** — moves the rewind point further
   back, because the real mistake was probably earlier than the point
   being blamed. If recent crashes from that point keep landing in
   almost exactly the same place regardless of which move was tried,
   it jumps back several steps at once instead of one, since that is
   a strong sign the mistake sits further back still.
3. The next route replays the **locked** (already proven) moves up to
   the rewind point unchanged, tries an unused move at that point, and
   explores afterwards with a **sticky random** rule — repeat the
   previous move most of the time (`stickiness`, default 60%),
   otherwise pick any of the nine at random. Pure randomness makes
   cars wobble and rarely survive; stickiness keeps exploration
   coherent.

Once a lineage has completed at least one lap, a second way to improve
switches on: a round that matches the current best distance in *fewer*
steps replaces the stored route, even though it went no further. This
is reward shaping toward speed once survival is secure, and can be
turned off in Settings to compare against cars that only ever optimise
for distance.

This is **not** a neural network or deep learning — it's closer to hill
climbing with backtracking. It is a genuine, honest introduction to
reward, exploration vs exploitation, and learning from failure, and the
app says so plainly (About drawer, and the "Go deeper" text on each
concept). The stored route is never described as the car "understanding"
the track.

### Sensor cars and neural networks (Phase 3, alternate mode)

A second mode, switched in the toolbar, replaces the memorised route
with a small neural network: seven sensor rays (roughly -90° to +90°
from the car's front) returning distance to the track edge, plus
current speed and distance to the nearest car ahead — nine inputs in
total — feeding a hidden layer and two outputs (throttle, steer),
which are then mapped back onto the same nine actions so every other
drawer keeps working unchanged.

Learning here is **mutation and selection**: each round, a car drives
with its parent network's weights plus a small random nudge. If it
goes further than its parent did, the mutated weights become the new
parent. There is no replay and no rewind — the network reacts to
whatever its sensors currently show, not to a memorised step number.

Because the skill is "react to what's ahead" rather than "turn left at
step 40", a trained sensor car has a real (if imperfect) chance on a
**track it has never driven**. The **Transfer test** (Settings drawer)
freezes the current weights, drops the cars on a different track with
learning switched off, and compares them against a freshly initialised
network — this is the single clearest demonstration in the app of why
generalising a skill beats memorising a route. Measured results (see
`PROGRESS.md`): an oval-trained network transferred well to Monza (a
similarly-shaped wide track, ~127m vs ~17m for a fresh network) but not
at all to Suzuka (a tight, asymmetric hairpin) — a good, honest example
of transfer being real but shape-dependent, not universal.

### Why six cars, independently

All six cars run identical rules, start from fixed grid positions, and
never share what they've learned — six separate lineages. They still
end up with different results, from randomness alone and from each
other's positions changing what "worked" in a given round. Other cars
are part of a changing (**non-stationary**) environment: a route that
worked perfectly on an empty track can fail if another car happens to
be in the way this time, and a round's distance can come in lower than
a car's own best purely because of that traffic — the car never
"forgets" its best on a bad round, it just doesn't improve on it.

### Determinism

Everything randomness-driven runs off a seeded generator (mulberry32),
one stream per car, derived from a single seed shown on screen. The
same seed, on the same track, in the same mode, reproduces the exact
same rounds, decisions and crashes every time — useful for testing,
for fairness when comparing settings, and as a teaching point in its
own right (see "Randomness, seeds and why runs differ" below).

## Tracks

Progress is saved **per (track, mode) pair** — switching track or mode
shows that pair's own cars and learning history; returning to an
earlier one restores it.

| Track | Inspired by | Difficulty | Teaches |
|---|---|---|---|
| Speedway Oval | Indy 500 oval | 1 (easiest) | A forgiving start: simple steering is enough to learn it. |
| Monza | Monza | 2 | Long straights, heavy braking zones. |
| Interlagos | Interlagos | 3 | Frequent direction changes. |
| Barcelona | Circuit de Barcelona-Catalunya | 3 | A balance of fast and slow corners. |
| Silverstone | Silverstone | 4 | Rewards smooth steering through fast sweepers. |
| Brands Hatch | Brands Hatch | 4 | Flowing sweepers at one end, a tight hairpin at the other. |
| Spa | Spa-Francorchamps | 5 | Mixes very high speed sections with technical corners. |
| Suzuka | Suzuka | 5 (hardest) | Narrow and tight throughout; a single closed loop, not a true figure-of-eight. |

All tracks are **schematic, hand-authored approximations** of the
general shape of each circuit — not traced from any map, not to scale,
and carrying no official logo, trademark artwork or sponsor name. They
are labelled "inspired by" in the UI and names are deliberately altered.
Elevation changes are not modelled. Run `npm run validate:tracks` after
editing or adding a track — it checks for a closed loop, no
self-crossing, a sensible minimum corner radius, and a sensible length.

## Settings

All teacher-facing settings live in the Settings drawer and map directly
onto the learning rules above.

| Setting | Default | Range | What it changes |
|---|---|---|---|
| Seed | random | any integer | The whole learning history. Same seed + track + mode = identical run. |
| Base rewind (steps) | 1 | 1–5 | How far before a crash a car first changes its mind. |
| Patience | 3 | 1–6 | Failed rounds at one rewind point before backtracking further. |
| Big rewind jump | 2 | 1–5 | Steps jumped back in one go when a car keeps crashing in the same spot regardless of move tried. |
| Stickiness | 60% | 0–90% | How often exploration repeats the previous move rather than picking fresh. |
| Lap target | 3 | 1–10 | Laps needed to be "Finished". Raise it once all six cars get there. |
| Car-to-car collisions | on | on/off | Whether cars can block each other (the non-stationary-environment lesson). |
| Show learned lines | on | on/off | Each car's best route so far, drawn as a faint trail. |
| Show crash marks | off | on/off | Marks left where a car has crashed. |
| Pause between rounds | 1.5s | 0–5s | Only at 1× and 2× speed. |
| Optimise for speed once a lap is secure | on | on/off | Turn off to compare against cars that only ever optimise for distance. |
| Mutation size (sensor mode) | — | — | Size of the random nudge applied to a parent network's weights each round. |

Use **New seed** to start a fresh run from scratch, **Restart round**
to replay the current round from the start grid, and **Reset learning**
(behind a confirmation) to wipe a lineage's memory for the current
track and mode.

## Teaching notes

The Concepts drawer is the main teaching surface: short cards that
unlock as the relevant event happens on screen, each with a plain-English
explanation (Level 2 reading level), a "Go deeper" section (Level 3 /
T-Level vocabulary and the underlying idea), and one discussion question
for the class. The full wording lives as plain data in
`src/content/concepts.js`, editable without touching any component.

Suggested order to use this in a session, with the concept each step
unlocks:

1. **Open the app, let it run at 1× for a minute.** *The agent and the
   environment* unlocks immediately. Ask: *what is the "environment"
   for a person learning to ride a bicycle?*
2. **Pause on a crash, open the Brain drawer for that car.** *Actions:
   nine possible moves* and *Reward: distance as a score* unlock here.
   Point at the 3×3 action grid and the "Tried here" grid together —
   this is the clearest single screen for explaining action spaces.
3. **Watch a round end and open Round report.** *Trial and error, and
   the episode* unlocks. The "plan for next round" column in that
   table is the single most useful teaching view in the app — it
   states the learning decision in words, every round, for every car.
4. **Let several rounds pass, watch rewind points move.** *Exploring
   and exploiting*, *Why rewind before the crash*, and (once a car gets
   stuck) *Backtracking when stuck* unlock in sequence. This sequence
   maps directly onto exploration/exploitation and the credit
   assignment problem — both named explicitly in the "Go deeper" text,
   useful vocabulary to flag for T-Level students.
5. **Once any car completes a lap.** *Two goals, not one: surviving and
   being quick* unlocks — a concrete, visible example of reward shaping.
6. **Open the Learning chart drawer.** *The learning curve* unlocks.
   Ask the class to predict what a flattening line does and doesn't
   mean (stuck and needing to backtrack further vs. genuinely optimal)
   before revealing the card's answer.
7. **Use "New seed" to show a second run.** *Randomness, seeds and why
   runs differ* and *Why six independent learners give six different
   results* unlock together. Good pairing: run the same seed twice to
   show determinism, then a different seed to show what does and
   doesn't change.
8. **Switch track.** *It only works on this track* unlocks — a simple,
   honest first encounter with overfitting, well before the word
   "overfitting" needs to carry any technical weight.
9. **Switch to Sensor cars mode.** Concepts 13–15 unlock: *Sensors and
   neural networks*, *Weights and mutation*, and *Why the sensor cars
   can try a new track*. Run the **Transfer test** with Monza as the
   target track for the most dramatic, legible result (see "How it
   works" above for the measured numbers) — Suzuka, by contrast, is a
   good follow-up to show that transfer is not automatic or universal.

Discussion questions worth pulling out for a whole-class moment rather
than reading silently from the card:

- *"Why might having only nine choices make learning easier, compared
  with having unlimited ones?"* — a gentle route into discretisation
  and the size of a search space.
- *"If a car only ever explored and never locked anything in, what
  would happen to its progress?"* — exploration/exploitation trade-off,
  stated as a thought experiment before the card's own answer.
- *"Can you think of a reward for this task that sounds reasonable but
  would actually be a bad choice?"* — reward design and reward hacking,
  pitched at a level that doesn't need the vocabulary yet.
- *"What would a car need to know in order to drive a track it has
  never seen?"* — sets up the sensor/network mode before students have
  seen it, a good one to ask right before switching modes live.

Honesty note built into the app itself, worth repeating verbally: Phase
1/2 route learning is **not** a neural network and not deep learning —
it is trial-and-error search with memory, closer to hill climbing. It
is a fair and genuine introduction to reward, exploration and learning
from failure, but the About drawer and "Go deeper" text are deliberate
about not overclaiming. Phase 3's sensor cars are the first point in
the app where "neural network" and "weights" are used for real, and
the two modes are designed to be taught as a direct comparison rather
than route cars being a simplified stand-in for networks.

Accessibility note for running this live: the Commentary drawer is the
screen-reader equivalent of the canvas — if demonstrating with a screen
reader or projecting for a student who needs it, that drawer carries
the same information the visuals do, throttled to a readable rate.
State is never shown by colour alone (cars carry both a colour and a
pattern), and nothing on screen flashes faster than three times a
second.

## Status

All three build phases are complete and have passed their phase gates
in `BUILD.md` section 13:

- **Phase 1** — one oval track, six cars, route learning (rewind,
  backtrack, sticky-random exploration), save/load.
- **Phase 2** — full teaching layer (Concepts drawer, Learning chart,
  Commentary, Round report), the remaining seven tracks, mobile layout,
  export/import, accessibility pass.
- **Phase 3** — Sensor cars mode (seven-ray sensing, neural network,
  mutation-and-selection learning), live network view, Transfer test.

See `PROGRESS.md` for the full build log, measured learning-speed and
transfer-test numbers, and bugs found and fixed along the way.
`BUILD.md` section 16 lists open decisions still to make.

## Licence

Released under Creative Commons Attribution-NonCommercial-ShareAlike 4.0
International (CC BY-NC-SA 4.0). You may share and adapt this work with
credit, for non-commercial use only, and adaptations must carry the same
licence. Full terms: https://creativecommons.org/licenses/by-nc-sa/4.0/

![CC BY-NC-SA 4.0](public/cc-by-nc-sa.png)

Author and licence holder: Simon Rundell, Exeter College.
