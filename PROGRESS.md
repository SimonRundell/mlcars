# MLCars: progress

Snapshot of where the build stands. See `BUILD.md` for the full spec and
phase gates, `CLAUDE.md` for style/process rules.

## Phase 0 - scaffold and direction

Done. Vite + React + JS scaffold, folder layout per `BUILD.md` section 8,
`react-doctor` installed, `cmFloatAd.jsx` copied in and wired into
`App.jsx`, root `.htaccess`, `README.md` with licence precis, CC badge
downloaded to `public/cc-by-nc-sa.png`. Tokens in `src/index.css`.

Flags from Phase 0, still open:
- `public/favicon.png` was missing, so it's currently a generated
  placeholder (flat blue square, dark border). Swap for a real one
  whenever.
- Trimmed `@types/react`, `@types/react-dom`, `oxlint` that
  `create-vite` adds by default - not on the allowed-dependency list
  (react/react-dom/vite/vite-react-plugin only) and unused in a JS-only
  project.

Visual direction (stated, nodded): toy-box board game come alive - flat
saturated colour, thick dark ink outline (3px) on every shape, warm
off-white chrome so toolbar/drawers read as cut from the same stamp set
as the track. Hard "sticker" shadows only on drawers and the primary
button. Okabe-Ito car colours, each car also has its own pattern.

## Phase 1 - one oval, six cars, learning that works

### Built

**Headless engine** (`src/sim/`, no React/DOM imports anywhere in here):
- `rng.js` - mulberry32, as a mutable `{a}` stream object so a round's
  RNG state can be snapshotted and restored (needed for "Restart round").
- `actions.js` - the nine moves (3 throttle x 3 steer), as a 0-8 index.
- `geometry.js` - vector math, closed Catmull-Rom spline sampling,
  curvature, segment-closest-point.
- `track.js` - builds centreline samples/edges/kerb flags from a
  `TrackDef`; windowed nearest-sample lookup (`locateOnTrack`) so it
  never searches the whole track per tick.
- `physics.js` - one fixed tick of car motion (accel/brake/drag, grip-
  limited steering).
- `collisions.js` - each car as three circles; track-edge test and
  car-to-car overlap test.
- `routeBrain.js` - Phase 1 learning: lineage state, `planNextRound`
  (rewind/backtrack per BUILD.md 4.3), `decideAction` (locked / new-
  choice / sticky-random explore per 4.4).
- `world.js` - the round loop: ticks all six cars, runs decisions at
  step boundaries, resolves wall/car-car/wrong-way/time-up/finished,
  advances lineages between rounds, emits events (`roundStarted`,
  `rewindPointReached`, `carStopped`, `roundEnded`, `allFinished`,
  `settingsChanged`, `learningReset`). Also owns `restartRound`,
  `resetLearning`, `newSeed`, `updateSettings`, `snapshot()` (throttled
  React view) and `serialize()` (save data).
- `persistence.js` - localStorage save/load (`mlcars.v1`), JSON
  export/import helpers, all wrapped in try/catch.

**Renderer** (`src/render/`, canvas-only, no sim logic):
- `palette.js` - reads the CSS token palette into a plain object.
- `trackLayer.js` - draws grass/tarmac/kerbs/centre-line/start line once
  to an offscreen canvas (the "cached layer").
- `carSprite.js` - one cartoon car: rounded body, identity pattern,
  number, googly eyes (wide/locked/happy-squint/dizzy-spiral states).
- `effects.js` - poof cloud + orbiting stars on a crash, reduced-motion
  aware.
- `overlays.js` - learned-line trail (replays a lineage's best route
  through plain physics from the fixed grid start) and crash marks.

**React/UI** (`src/ui/`, `src/hooks/`):
- `useWorld.js` - owns the `World` instance, the fixed-step accumulator
  loop (speed only changes ticks-per-frame, never the result), play/
  pause/step/speed, the three pause switches, a throttled
  `useSyncExternalStore` snapshot (~10/s) for React, and a live
  `effectsRef`/`interpAlphaRef` the canvas reads directly every frame.
- `useReducedMotion.js`.
- `Toolbar.jsx`, `CarRail.jsx`, `TrackCanvas.jsx`, `Drawer.jsx`,
  `BrainDrawer.jsx`, `ActionGrid.jsx`, `RouteStrip.jsx`,
  `RoundReport.jsx`, `SettingsDrawer.jsx`, `icons.jsx` (custom inline
  SVG, no emoji/icon font).
- `App.jsx` wires it all together, handles persistence load/save,
  keyboard shortcuts (Space/./1-6/R), and the aria-label summary
  refreshed every 2s.

Only one drawer can be open at a time right now rather than the spec's
two - simplification, easy to lift later.

### Verified headlessly (no browser available in this environment)

- **Determinism**: same seed, 50 rounds, run twice - byte-identical
  round-by-round results both times.
- **Build**: `npm run build` clean before the `oval.js` conflict below
  appeared.
- **Tuning**: default `OMEGA_MAX` (1.2 rad/s) made cars spin off the
  track almost immediately during random exploration - several
  lineages stuck under 250m of a 1418.6-unit track after 2000 Turbo
  rounds. Dropped `OMEGA_MAX` to 0.5 in `src/constants.js` (doesn't
  change full-speed cornering, which is governed by the grip-limit term
  `A_LAT_MAX / speed`, not this ceiling - only low-speed sharpness).
  After the fix: all six cars complete at least one lap within ~1700
  rounds / 5 minutes of Turbo-equivalent compute, averaging ~2000-2400m
  of the 4256m (3-lap) target; none fully finished within 5 minutes.
  That's past BUILD.md's "~5 minute" guideline for this done-when check.
  Tried stickiness 0.8 and 0.9, and patience 6, as alternatives over
  shorter runs - none beat the `OMEGA_MAX` fix alone over a full 5-
  minute run, so stickiness/patience are left at the spec defaults
  (0.6 / 3) for you to tune in Settings if you want faster convergence.

### Not yet done / not verified

- No visual check at 375px/1280px or in an actual browser. Build-level,
  headless-sim and code-reading checks only throughout this project so
  far - no browser tool has been reachable in any session yet (Claude
  in Chrome stayed disconnected through this whole Phase 2 session too,
  despite several retries). You still need to eyeball the cartoon
  rendering, drawer layout and touch targets yourself.
- Smoke test checklist (`BUILD.md` section 14) not run end-to-end.
- `scripts/checkDeterminism.js` not added (optional, needs your go-
  ahead per BUILD.md section 14).

## Phase 2 - teaching layer and more tracks

You gave the go-ahead to (a) treat the Brands Hatch/Silverstone/Monza/
Spa/Suzuka/Interlagos/Barcelona track data already sitting in `oval.js`
as the real Phase 2 track list (replacing `BUILD.md`'s original
Silverstone/Monza/Monaco/Spa/Interlagos/Albert Park list, and building
Suzuka rather than deferring it), and (b) keep building ahead of a
visual check, which is still blocked on a missing browser tool.

### Built

**Tracks** - `src/tracks/oval.js` had a broken reference (old constant
names) blocking the whole build; fixed first. The six non-oval/spa
track point arrays that were already there failed `validateTracks.js`
(self-crossing centrelines, or turn radii tighter than half the road
width) once actually run - these were schematic sketches, not yet
checked geometry. Redesigned all six, still schematic and still
"inspired by" (no traced maps, no F1 branding, per BUILD.md 6.2):
Monza is a stretched oval-style stadium shape (long straights, heavy
braking at each end); Brands Hatch and Suzuka use the same stadium
construction but with a noticeably tighter radius at one end than the
other, for a relative hairpin feel; Interlagos, Barcelona and
Silverstone keep their original hand-authored corner sequence, scaled
and narrowed until they clear the validator with a reasonable margin.
Suzuka turned out not to need a figure-eight bridge in the collision
model after all - this build is a simple closed loop, so `BUILD.md`
6.2's deferral note is removed. All 8 tracks now pass
`npm run validate:tracks` (new script, closed loop / no self-crossing /
min turn radius > half road width / sensible length) and are wired
into `tracks/index.js`'s `TRACKS` array, ordered by difficulty.
`BUILD.md` section 6.2 and section 16 updated to match.

**Track switching** (`App.jsx`): a track picker `<select>` in the
toolbar. Switching tracks builds a fresh `World` for that track,
re-loading its own saved seed/lineages/history from `localStorage` if
there is any (BUILD.md 9 - "returning to an earlier track restores its
progress"). Settings stay global across the switch.

**Teaching content** (`src/content/concepts.js`): all 15 concept cards
from `BUILD.md` section 7.2, each with `plain`/`deeper`/`ask`/`level`
text and a `trigger` id. `src/hooks/useConceptUnlocks.js` maps world
events (and a track-id comparison, for "it only works on this track")
to those triggers, tracks which cards have unlocked, and queues
"Concept unlocked" notices. The three Phase 3 cards (sensors, weights,
transfer) are written but permanently locked until Phase 3 exists -
there's no sensor mode yet to unlock them.

**New drawers**: `ConceptsDrawer.jsx` (locked/unlocked cards, Go
deeper toggle), `ConceptUnlockedNotice.jsx` (non-blocking, bottom-right
of the stage, auto-dismisses, CSS slide-in that the existing global
`prefers-reduced-motion` rule already neutralises), `Commentary.jsx` +
`src/hooks/useCommentary.js` (plain-English log built from world
events, `aria-live="polite"` with a mute toggle, one summary line per
round at Turbo rather than per-event per BUILD.md 3.3's explicit
throttling rule), `LearningChart.jsx` (hand-written SVG, one dashed
line per car plus end labels, dotted guides at one lap and the lap
target, hover/focus text readout on downsampled points with 44px hit
targets), `AboutDrawer.jsx` (what it is, the honesty note from BUILD.md
7.3, licence precis and badge).

**Export/import**: `persistence.js` already had the helpers; wired a
"Save data" section into `SettingsDrawer.jsx` (export downloads a
`.json`, import validates and refuses a mismatched version per
BUILD.md 9, then reloads the page to apply it cleanly).

**Code-level accessibility pass** (no browser available, so this is a
read-through against BUILD.md section 11, not a tested one): fixed a
few things found along the way, not just in the new Phase 2 pieces -
`Step`/`Restart round`/`Reset learning`/`Brain`/`Round report`/
`Settings` toolbar buttons had no accessible name once `.button__label`
is hidden by CSS under 899px (only Play/Pause had a screen-reader
fallback) - all icon-only toolbar buttons now carry an explicit
`aria-label`, including the Reset-learning confirmation state. All of
this session's new icon-only controls got 44px touch targets (checkbox
rows were sitting at a bare 22px before this pass too - bumped
`.field--checkbox` to `min-height: 44px`, which also fixes the
pre-existing Settings/pause-switch checkboxes). Two colour pairings
that would have failed 4.5:1/3:1 contrast were caught by calculation
and changed: the concept-notice label and the chart's lap-target guide
line no longer rely on `--colour-accent` as their only distinguishing
feature. **None of this has been seen rendered** - treat it as a
reduction in known risk, not a pass.

### Verified

- `npm run build` clean (55 modules).
- `npm run validate:tracks` - all 8 tracks pass.

### Not yet done / not verified

- Still no browser in this environment, so: no visual check of any
  Phase 2 drawer, no confirmation the "Concept unlocked" notice
  actually appears/positions correctly, no confirmation the Learning
  chart renders sensibly with real history data, no check of the track
  picker or mobile bottom-sheet layout with the extra toolbar buttons
  (there are now quite a few - worth an eye on wrapping at 375px).
  Everything above is reasoned from code and `npm run build`/
  `validate:tracks` output only.
- The `BUILD.md` 3.1 "two drawers open at once" desktop behaviour is
  still the Phase 1 simplification (one at a time) - now with more
  drawers competing for that one slot.
- Commentary/concept-unlock state doesn't reset on a track switch, so
  the log keeps lines from the previous track and "it only works on
  this track" is the only concept a track switch can unlock on its
  own. Low-risk, not fixed - flagging in case it reads oddly in use.
- `scripts/checkDeterminism.js` still not added (optional, still needs
  your go-ahead).

## Post-Phase-2 addition: efficiency phase

You asked for cars to start optimising for speed once they can survive a
lap, not just keep maximising distance. Implemented as a second way for
a round to become the new "best", on top of (not instead of) the
existing distance-maximising rule - see `BUILD.md` section 4.3a for the
full writeup:

- `world.js` now tracks, per car per round, `matchStep` - the decision
  step at which the car's distance first reaches what its lineage's
  `bestDistance` already was at the start of the round.
- `routeBrain.js`'s `planNextRound` gets a second acceptance path: once
  `lineage.lapsDone >= 1`, a round that matches (not exceeds) the old
  `bestDistance` in fewer steps than the current `best` route replaces
  it - same distance, fewer steps, same rewind/backtrack/explore
  machinery as every other round. `best.length` is now always "fewest
  steps known to reach bestDistance".
- New setting `optimizeForSpeed` (default on), teacher-toggleable in
  Settings, so you can compare against cars that only ever care about
  survival.
- Surfaced in the Round report ("New best or faster?" column) and
  Commentary ("Car N found a faster way to the same distance..."), and
  a new concept card ("Two goals, not one: surviving and being quick",
  `src/content/concepts.js`) unlocked the first time any car banks a
  lap.
- Verified headlessly by calling `planNextRound` directly with
  constructed lineage/result objects (four cases: a genuine efficiency
  win, a still-better distance win taking priority over it, a
  not-actually-faster round correctly rejected, and the setting turned
  off correctly disabling the whole path). Not seen running in the
  actual simulation - that needs your eyes on the next few rounds after
  a car completes lap 1.

## Post-Phase-2 addition: same-spot backtracking

You asked for cars that keep crashing in the same physical spot to jump
back further than the usual one step, configurable 1 to 5. Implemented
as a refinement of the existing backtracking rule, not a separate
mechanism - see `BUILD.md` section 4.3, point 2:

- `routeBrain.js`'s `Lineage` gains `crashLocations` (mirrors `tried`,
  keyed by rewind step): each failed attempt's stop distance, taken mod
  track length so a crash just before the start line and one just after
  it still count as the same spot.
- When a backtrack would normally happen (patience exhausted, or all
  nine actions tried), it now checks whether the recent crash locations
  at that rewind step all fall within `CRASH_LOCATION_TOLERANCE` (6
  world units, an internal constant, not teacher-facing) of each other.
  If so, `rewind` jumps by the new `bigRewindJump` setting (default 2,
  range 1 to 5) instead of by 1.
- New Settings slider: "Big rewind jump". Surfaced in Commentary ("Car
  N kept crashing in the same spot...") and the Round report's plan
  column. Concept 7 ("Backtracking when stuck") updated to explain it.
- Verified headlessly: three clustered crashes trigger the big jump,
  three spread-out ones don't, and a wrap-around case (crashes on
  opposite sides of the start/finish line but physically close) is
  correctly recognised as the same spot. Not seen running live.

## Post-Phase-2 addition: verbose log + a real bug found and fixed

You said you hadn't seen the bigger same-spot rewind jump happen and
saw no change in behaviour. I ran the actual `World` class headlessly
(not just the isolated unit test from before) for real rounds on both
Suzuka and the oval, which turned up two things:

- **It is firing.** On a 3000-round Suzuka run, 323 of ~11800 backtracks
  were "same spot" big jumps (~2.7%). On the oval, which cars survive
  on for longer, it was much more common - 530 of ~1368 (~39%) in an
  837-round run. So the mechanism works; it's just easy to miss, partly
  because the Commentary line for it is suppressed at Turbo speed
  (same rule as every other per-event Commentary line), and partly
  because one rewind number quietly changing doesn't look like much
  frame to frame.
- **A real bug**: `lineage.crashLocations[rewindStep]` never got reset
  on an ordinary (non-big) backtrack, so a car stuck at the same rewind
  step for hundreds of rounds - which is exactly what happens once
  `rewindStep` floors at 0, because there is nowhere further back to
  go - kept appending to the same array forever. That both wastes
  memory over a long run and dilutes the "same spot" check with
  increasingly stale history. Fixed: `crashLocations[rewindStep]` is
  now cleared every time a backtrack happens, so each check only looks
  at the current patience-cycle's own crashes. Verified headlessly
  (200 simulated stuck rounds, array stayed at size 2, not 200).
- I did **not** find a clear, repeatable improvement in how far cars
  get with the feature on vs off across a handful of seeds in short
  runs - sometimes better, sometimes worse, within normal run-to-run
  noise. I would not read anything into that either way without a lot
  more seeds/time than is practical to check headlessly; flagging it
  so you're not expecting a dramatic visible improvement, just a
  different (hopefully more sensible) way of choosing how far to
  rewind when stuck.

**New: a verbose diagnostic log**, for actually seeing this yourself.
In the Commentary drawer, a new checkbox: "Verbose: log every car,
every round (also to the browser console)". Off by default (it's a
debugging aid, not teaching content, so it's local to the drawer, not
a saved Settings value). When on, every round gets one line per car in
the Commentary list - distance, cause, the lineage's rewind value
right now, its current best route length, and `+1` / `BIG JUMP +N` /
`EFFICIENCY WIN` tags - plus the same rows as a `console.table` in the
browser's DevTools console (throttled to at most once every 150ms so
Turbo speed doesn't flood it). This bypasses the usual Turbo
suppression, on purpose, since the whole point is to see it.

## Phase 3 - sensors and neural network cars

Built in one pass per your go-ahead, with your answers to three
clarifying questions locked in up front: nine sensor inputs (the
optional nearest-car-ahead included from the start), and the mode
switch (Route cars / Sensor cars) works exactly like the track picker -
each (track, mode) pair keeps its own independently saved seed,
lineages and history.

### Built

**Sim** (`src/sim/`, same no-React/DOM/Math.random rules as everything
else here):
- `sensors.js` - seven forward rays (-90 to 90 degrees) cast by
  marching outward in 2-unit steps and reusing `locateOnTrack`'s
  windowed lookup (no full-track scans), plus normalized speed and
  nearest-other-car distance. All readings in [0, 1], 1 = clear to the
  40-unit sensor range.
- `neuralBrain.js` - a 9-8-2 tanh network (plain nested arrays, so it's
  ordinary JSON for save/export), `mutate()` (gaussian noise via a new
  `gaussian()` helper added to `rng.js`, keeping Phase 3's randomness
  routed through the same seeded streams as everything else), and
  `selectNextRound` - the "if it travels further than the parent, the
  child becomes the parent" hill-climb rule from BUILD.md 13, nothing
  more.
- `world.js` gained a `mode` ('route'/'sensor') and `learningEnabled`
  constructor option. Route mode is completely unchanged; sensor mode
  branches at the three places it actually differs (lineage shape,
  the per-step decision, and the end-of-round planning call) and
  shares everything else - physics, collisions, the round lifecycle,
  start grid.

**UI**: a Route cars / Sensor cars switch in the toolbar; a live
network view in the Brain drawer (sensor values, hidden/output nodes
lit by activation, connection lines thicker for larger weights,
numbers everywhere - never described as the network "thinking", per
the honesty rule in BUILD.md 7.3); the seven sensor rays drawn on the
canvas for whichever car is selected; a Transfer test (Settings drawer:
pick a track, freeze the current weights, run with learning off,
non-persisted, with a banner across the top and an exit button);
`mutationSigma` added to Settings; Commentary, the Round report and
the Concepts drawer (concepts 13-15 unlock the first time you switch
to Sensor cars) all updated for sensor-mode-appropriate text instead
of route-specific rewind language.

### Bugs found and fixed while verifying this headlessly

- `showLearnedLines` is a global setting; `TrackCanvas.jsx` was reading
  `car.lineage.best.length` unconditionally to draw it, which doesn't
  exist on a sensor lineage. Would have thrown the moment someone
  switched to Sensor cars with that setting still on from Route mode
  (it's on by default). Guarded by mode.
- Commentary's verbose logging block had the same unconditional
  `.best.length` access, behind the verbose toggle rather than a
  default setting, so it was a quieter trap - only crashes if someone
  turns Verbose on while in sensor mode - but a crash all the same.
  Fixed, with a separate sensor-appropriate log shape (parent best
  distance and mutation-kept/discarded, not rewind/steps).
- The Transfer test's first implementation copied each lineage's
  `finished` flag across to the new track along with the weights. A
  lineage that had already finished its lap target on the home track
  starts a round already "retired" (BUILD.md 4.5 - non-colliding,
  distance frozen at 0 for that round) - so a fully-trained car
  dropped into a transfer test never actually drove at all, just sat
  at the start line. Caught because my own headless measurement showed
  all six transferred distances as exactly 0, which was the tell.
  Fixed: only the network weights transfer; progress markers
  (bestDistance, lapsDone, finished) reset to zero/false so the car
  actually attempts the new track.
- `TrackCanvas.jsx` read `selectedCarIndex` directly inside a
  `useEffect` whose dependency array didn't include it (by design -
  the rAF loop isn't meant to restart every time you click a different
  car chip), which would have made the sensor-ray overlay follow a
  permanently stale car. Fixed with a ref, the same pattern the file
  already uses for other frequently-changing values.

### Measured, per BUILD.md 13's explicit instruction not to change the lineage rule without reporting first

- **Learning speed**: all six sensor-mode hill climbers reached the
  full 3-lap target on the oval in 194-368 rounds (7-16 seconds of
  headless Turbo-equivalent compute) across three seeds. Far faster
  than route learning needed for even one lap in Phase 1. No slowness
  concern - nothing to change here.
- **Transfer test**: genuinely track-dependent, not a universal
  "sensor always wins" result. Trained only on the oval, then frozen
  and dropped on:
  - **Monza** (also a wide, stadium-shaped track): averaged 127m vs
    17m for a freshly-initialised, never-trained network. A clear,
    dramatic difference - a good track to pick for the first classroom
    demo.
  - **Silverstone**: ~23m vs ~12m. A real but modest edge.
  - **Interlagos**: ~17m vs ~10m. Modest.
  - **Suzuka** (tight, asymmetric, a hairpin at one end): ~15m vs
    ~23m - the fresh random network did *better* this time.
  - Reading: a network trained only on one easy, symmetric track
    learns a skill that generalises to similarly-shaped tracks, not to
    every shape. That is itself consistent with the honesty this app
    is built around (concept 15's "Go deeper" already says transfer
    "is never perfect"), but it does mean the demo's punch depends on
    which track you pick as the test target. I have not changed
    anything about the mutation/selection rule in response to this -
    flagging it as information for you, per BUILD.md's instruction,
    not treating it as a defect to silently fix.

### Not yet done / not verified

- Still no browser in this environment - nothing in Phase 3 has been
  seen rendered, same caveat as everything else in this file. The
  network view, the sensor rays on the canvas, and the Transfer test
  banner are all code-reviewed and headlessly logic-tested (the World
  class underneath, directly) but never actually looked at.
- Accessibility pass not repeated for the new Phase 3 UI (mode switch
  buttons, network view SVG, transfer banner) - worth a pass once
  you've seen it, same as the rest of this file's standing caveat.

## Suggested next steps

1. Run the dev server (yours, already on :5173) and actually look at
   everything - Phase 2's drawers plus Phase 3's mode switch, network
   view, sensor rays and Transfer test, at both 375px and 1280px. This
   whole session, both phases, has been built and reasoned about
   without ever seeing it render.
2. Run the Phase 1 smoke test checklist (`BUILD.md` 14) now that
   there's much more surface to it.
3. Decide on the Phase 1 tuning question above if you haven't already
   (leave as-is / keep tuning / accept current pacing).
4. Try the Transfer test yourself with Monza as the target first - the
   numbers above say that is where the lesson lands most clearly.
5. Phase 3 gate: confirm the "done when" criteria in `BUILD.md` 13.
