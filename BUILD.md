# MLCars: BUILD.md

A cartoon racing simulation where six small cars learn to drive round a track by trial and error. Students watch the learning happen, step by step, through windows and drawers laid over the track.

Audience: 16 to 19 year old FE students on NCFE Level 2, BTec Level 3 and T-Level Level 3 programmes.
Author and licence holder: Simon Rundell, Exeter College. Licence: CC BY-NC-SA 4.0 (see section 12).

---

## 0. How to use this document

1. Read `CLAUDE.md` first. It sets the styling rules, accessibility minimums, workflow and licence. This file adds the scope for MLCars. Where the two disagree, `CLAUDE.md` wins on style and process, and this file wins on scope.
2. Work one phase at a time (section 13). Stop at the end of each phase, summarise what exists, and wait for me to test. I will run all tests beyond smoke tests myself.
3. You may ask me up to five questions at a time at a phase gate. Do not ask mid-phase unless something blocks you.
4. Do not add dependencies beyond `react`, `react-dom`, `vite` and the Vite React plugin without asking. No chart library, no UI kit, no game engine, no CSS framework.
5. Everything is JavaScript with JSDoc on every function, component and hook. No TypeScript.

### Deliberate departures from CLAUDE.md

MLCars is a client only app. That changes a few things, and these are decisions, not oversights:

* There is **no `/api` folder, no PHP, no MySQL, no JWT and no `cors.php`**. There is nothing to protect on a server.
* There is no secret configuration, so a `.config.json` is not needed. Tunable defaults live in `src/constants.js`. The `.htaccess` rule that blocks `.config.json` is still included, so a later backend cannot expose one by accident.
* The `mlc_` table prefix is reserved in case a backend is added later. Do not create any tables now.
* The dev machine notes in `CLAUDE.md` (MariaDB, WINSERV) are not needed for this app. Vite serves the frontend. If port 5173 is already in use, my Vite instance is already running: use it, do not kill it and start another.

---

## 1. The idea in one paragraph

Six cars sit on a start grid on a racetrack. They all drive at once. Each step, each car chooses one of nine moves (speed up, hold or slow down, combined with steer left, straight or right). A car keeps going until it hits the track edge or another car, and then it stops where it is. When every car has stopped, the round is over and the next one begins. Each car remembers the moves that got it as far as it went. In the next round it replays those learned moves up to a little before the crash, then makes a different choice and carries on until it fails again. Over hundreds or thousands of rounds the cars should get further and further, and eventually complete several laps. The learning is made visible: every decision, every memory and every crash is explained in drawers over the track.

The track starts as a simple oval in the style of an Indy 500 speedway. Later tracks are simplified layouts inspired by Formula 1 circuits.

---

## 2. Decisions already made

| Topic | Decision |
|---|---|
| Learning method | Phased. Phase 1 to 2: move-sequence learning (cars remember a list of moves). Phase 3: sensor-based neural network cars, so students can compare the two. |
| Cars sharing knowledge | **Independent lineages.** Six separate learners. No car copies another. Each car improves only from its own history. |
| Backend | **Client only.** Save and load through `localStorage` plus JSON export and import. |
| Teaching depth | Plain English by default, with a "Go deeper" section on each concept for Level 3 vocabulary and the maths. |
| Rendering | HTML canvas (2D). The track and scenery are drawn once to a cached layer. Cars, effects and overlays are redrawn each frame. |
| Car to car collisions | On by default. Both cars stop. A teacher setting can turn them off. |
| Audio | None in version 1. It is a classroom. |

---

## 3. What the student sees

### 3.1 Screen layout

**At 1280px wide**

* Top: toolbar (section 3.2).
* Centre: the track canvas, scaled to fit, keeping its aspect ratio.
* Left edge: a rail of six **car chips**. Each is a button showing the car number, name, a one-word status and best distance. Pressing a chip selects that car and opens its Brain drawer.
* Drawers slide in over the track from the right and bottom edges. No single drawer may cover more than 40 percent of the stage width, and the student must always be able to see the cars. Two drawers can be open at once.

**At 375px wide**

* The track sits at the top of the screen and takes about 45 percent of the viewport height.
* The toolbar becomes a compact bar under the track.
* Drawers become bottom sheets. Only one is open at a time. Car chips become a horizontally scrolling row.

Drawers are non-modal. Focus is not trapped, the simulation keeps running behind them, and `Esc` closes the focused drawer.

### 3.2 Toolbar

* Play and pause.
* **Step**: advance exactly one decision step, animated.
* Speed: 1x, 2x, 5x, 20x, Turbo. Turbo runs as many simulation ticks as fit in a 10ms frame budget, and draws roughly ten times a second. In Turbo the drawers show a short "Updating once per round at this speed" note instead of flickering.
* Pause switches (each a labelled toggle): pause at next new choice, pause on any crash, pause at end of round.
* Track picker.
* Restart round, and Reset learning (a danger styled button with a confirmation step).
* Drawer buttons: Brain, Round report, Learning chart, Commentary, Concepts, Settings, About.

### 3.3 The drawers

These are the teaching heart of the app. They must update in step with the simulation, not after the fact.

**Brain drawer (one per car, shows the selected car)**

* Header: car number, name, colour swatch and pattern, status badge in words: *Replaying learned moves*, *Trying something new*, *Crashed: hit the wall*, *Crashed: hit car 4*, *Time up*, *Finished 3 laps*.
* **Current decision card.** Shows the step number and the chosen move on a 3 by 3 **action grid** (rows: speed up, hold, slow down; columns: left, straight, right) with the chosen cell highlighted and a plain text label such as "Speed up + Left". Underneath, a one line **reason**:
  * "Remembered from round 14" for a learned move.
  * "New choice. Straight + Hold already failed here" at the rewind point.
  * "Random choice after the rewind point" for steps beyond it.
* **Route strip.** A horizontal ribbon of step tiles, each with an action glyph. Tiles are styled by state: learned and locked (solid), the rewind point (flag marker), new exploring moves (dashed outline), the current step (pointer), and the last crash (an X). Render only the tiles around the current step (about 60), plus a compact **whole route bar** underneath showing the proportion of locked, new and crashed sections. Dragging the whole route bar scrolls the strip.
* **Tried here** mini grid: the 3 by 3 grid again, with actions that already failed at the rewind point crossed out. Crossed out means a shape, not only a colour.
* Stats: round number, distance this round, best distance, laps, rewind distance, failures at this rewind point (for example "2 of 3 before rewinding further").

**Round report drawer.** Opens at the end of every round (unless the speed is Turbo, where it only updates). A table of six rows: car, distance, how it stopped, new best or not, and a **plan for next round** in words, for example "Keep the first 37 moves, try something new at step 38." This is the single most important teaching view because it shows the learning decision explicitly.

**Learning chart drawer.** An SVG line chart (hand written, no library): best distance per round, one line per car, with distinct dash patterns plus direct end labels so it works without colour. Hovering or focusing a point gives a text readout. A dotted horizontal line marks one lap, and another marks the lap target.

**Commentary drawer.** A running log in plain English, newest at the top, for example:

* "Round 12 starts. Car 2 will replay 40 learned moves. Car 5 will replay 22."
* "Car 3 reached its rewind point at step 38 and tried Speed up + Left. It has never tried that here before."
* "Car 3 hit the outside wall at step 41. That is 3.2m further than its best. New best."
* "All cars stopped. Round 12 lasted 62 steps."

The log is the screen reader equivalent of the canvas (section 11). It is throttled so it never produces more than a few lines a second, and at Turbo it writes one summary line per round.

**Concepts drawer.** Glossary and concept cards (section 7). When a concept first becomes relevant, a small **Concept unlocked** notice appears at the edge of the stage, non-blocking, with a button to open that card.

**Settings drawer.** See section 4.6.

**About drawer.** What the app is, an honest note on how it differs from real machine learning (section 7.3), and the licence precis and badge (section 12).

### 3.4 Visual direction

State this direction back to me in two or three sentences and wait for a nod before you build the first screen, as `CLAUDE.md` asks.

My starting point: a toy box board game that has come alive. Flat saturated colour, a thick dark ink outline on every shape, big readable shapes, and a little humour. The app chrome (toolbar, drawers) is warm off-white with the same ink outline, so the whole screen looks printed from one set of stamps.

Specifics:

* **Track.** Grass in two chunky alternating stripes with a few seeded tufts and flowers, drawn once to the cached layer. Tarmac in warm grey with a dashed centre line. Red and white kerbs on the outside of corners (decide by curvature). A chequered start line. No photo textures.
* **Cars.** Chunky rounded bodies built from canvas paths. A big number on the roof. A **face on the windscreen**: two googly eyes whose pupils look in the direction of the steering. While exploring they look wide. When a car sets a new best distance they squint happily. On a crash the eyes become dizzy spirals and two or three small stars orbit the car (static stars if reduced motion is on). The stopped car stays where it crashed and is an obstacle for the others.
* **Learned line.** A faint dashed trail in each car's colour showing the best route it has found so far. This lets students see the line improving across rounds. A toggle shows or hides it.
* **Effects.** A short "poof" cloud on a crash. Nothing flashes faster than three times a second, and no full screen flashes. No screen shake.
* **Depth.** Hard offset "sticker" shadows (no blur) on drawers and the primary button only. Everything else is flat.
* **Icons.** Custom inline SVG components in `src/ui/icons.jsx`. No emoji, no icon font. Every icon that carries meaning also has a text label.
* **Avoid.** Purple gradients, glassmorphism, a centred hero with three cards, emoji as icons, shadows on everything.
* **Type.** Trebuchet MS, as set in the tokens. Use bold weight for headings and car numbers.
* **Car identity.** Six cars, each with a name, a number, a colour **and a pattern** (plain, stripe, spots, chevron, checks, hoops), so state and identity never depend on colour alone. Suggested names: Rusty, Zippy, Bolt, Dot, Sprocket, Pip. Keep them in `constants.js` so I can change them.

---

## 4. How the learning works (phase 1 method)

This section is the contract for the learning code. Keep the learning code free of React, in `src/sim/routeBrain.js`.

### 4.1 Vocabulary used in the code

* **Step**: one decision. A step lasts 12 physics ticks (0.2 seconds of simulated time).
* **Action**: one of nine moves, numbered 0 to 8. Throttle is `accelerate`, `hold` or `brake`. Steer is `left`, `straight` or `right`. Put the table in `src/sim/actions.js`.
* **Route**: an array of actions, one per step, for one car.
* **Round**: one attempt by all six cars from the start grid until all have stopped.
* **Lineage**: one car's own learning record. There are six, and they never share.

### 4.2 What each car remembers

```js
/**
 * @typedef {Object} Lineage
 * @property {number[]} best        Best route found so far (actions up to and including the crash step).
 * @property {number}   bestDistance Distance reached by that route, in metres of track.
 * @property {number}   rewind       How many steps before the crash to go back (starts at baseRewind).
 * @property {number}   failures     Rounds in a row from this rewind point that did not beat bestDistance.
 * @property {Object<number, number[]>} tried  Actions already tried at each rewind step index.
 * @property {number}   lapsDone     Laps in the best attempt.
 * @property {boolean}  finished     True once the lap target is reached.
 */
```

### 4.3 Planning the next round

After each round, for each car that has not finished:

1. If this round's distance beat `bestDistance`: store this round's route as the new `best`, reset `rewind` to `baseRewind`, reset `failures` to 0, and clear `tried`.
2. Otherwise: add one to `failures`, record the action tried at the rewind step in `tried`, and record where this attempt stopped (distance mod trackLength) in `crashLocations[r]`. If `failures` reaches `patience`, or all nine actions have been tried at the rewind step, **backtrack**: the real mistake was earlier than the one we blamed. Normally add one to `rewind`. But if every recorded `crashLocations[r]` entry for this rewind step sits within `CRASH_LOCATION_TOLERANCE` (6 units) of the first one - the car keeps dying in much the same spot no matter which of the nine actions it tries at `r` - add `bigRewindJump` instead of one, in a single jump. Either way, reset `failures` to 0.
3. Work out the rewind step: `r = max(0, best.length - rewind)`.
4. Build the next route: copy `best` for steps 0 to `r - 1` (these are the **locked, learned** moves). At step `r`, pick an action at random from those not yet in `tried[r]`. After step `r`, **explore** with the sticky random rule in 4.4.

Start values: `baseRewind = 1` (the step before the critical point, as described in the brief), `patience = 3`, `bigRewindJump = 2`. All three are in Settings.

If a car's distance in a round is worse than its best (for example because traffic got in the way), its parent stays the stored best. The car never gets worse. This also teaches a real point: other cars are part of the environment, and they make the world less predictable.

### 4.3a Efficiency phase, once a lap is banked

Survival is not the only thing worth improving. Once a lineage's `best` route has completed at least one lap (`lapsDone >= 1`), add a second way for a round to win, checked after step 1 above and before the failure path in step 2:

* If this round's distance did **not** beat `bestDistance`, but it still reached at least `bestDistance`, and it did so in fewer decision steps than the current `best` route took (tracked as `matchStep`, the step at which this round's distance first reached the old `bestDistance`): truncate `best` to `route.slice(0, matchStep + 1)`, keep `bestDistance` unchanged, and reset `rewind`/`failures`/`tried` exactly as a normal win would.

`best.length` therefore always means "fewest steps known to reach `bestDistance`" - it only gets longer when distance improves, and only gets shorter when speed improves at the same distance. This reuses the same rewind/backtrack/explore machinery in 4.3 and 4.4 unchanged; it just gives a round a second way to count as better. Teacher setting: `optimizeForSpeed`, default on (section 4.6).

### 4.4 Exploring after the rewind point

Pure random choice makes cars wobble and rarely survive. Use a **sticky random** rule: with probability `stickiness` (default 0.6) repeat the previous action, otherwise pick uniformly from all nine. Expose `stickiness` in Settings. I expect to tune this, so keep it a single named constant.

### 4.5 Reward, finishing and time limits

* **Reward** is distance along the track centreline, counted continuously across laps (`laps * trackLength + distanceAlongLap`). More distance is better.
* A car that completes the **lap target** (default 3) stops as *Finished*. It becomes non-colliding and is drawn faded, so it does not block others. Its lineage stops changing until the lap target is raised.
* A car that is still running when the **round step limit** is reached stops as *Time up*. Set the limit so a car crawling at the minimum speed cannot survive for ever: `roundStepLimit = ceil(trackLength * lapTarget / (0.4 * maxSpeed * stepSeconds))`. This also guarantees every round ends.
* A car that moves backwards along the track for more than a set distance stops as *Wrong way*.
* **Stop causes** (shown in the UI): *Hit the wall*, *Hit car N*, *Wrong way*, *Time up*, *Finished*.
* When a car hits another car, **both** stop and both get the *Hit car N* cause. Each then plans its next round as normal.

When all six lineages have `finished`, show a celebration (a flat cartoon banner, no confetti storm) and a button to raise the lap target by two and keep learning.

### 4.6 Settings (teacher facing)

| Setting | Default | Range |
|---|---|---|
| Seed | random, shown on screen | any integer, with "new seed" button |
| Base rewind (steps) | 1 | 1 to 5 |
| Patience (failures before rewinding further) | 3 | 1 to 6 |
| Big rewind jump (steps back when stuck crashing in the same spot, section 4.3) | 2 | 1 to 5 |
| Stickiness (repeat previous move) | 60% | 0 to 90% |
| Lap target | 3 | 1 to 10 |
| Car to car collisions | on | on / off |
| Show learned lines | on | on / off |
| Show crash marks | off | on / off |
| Pause between rounds (at 1x and 2x only) | 1.5s | 0 to 5s |
| Optimize for speed once a lap is secure (section 4.3a) | on | on / off |

Use a small seeded generator (mulberry32 is fine) in `src/sim/rng.js`. Give each car its own stream, derived from `seed + carIndex`. The same seed on the same track must reproduce the same learning history.

### 4.7 Determinism is a hard requirement

Replaying a locked prefix must reproduce exactly the same car state, every time. That means:

* Fixed time step, 60 ticks per second, never `performance.now()` deltas inside the physics.
* All randomness through `rng.js`. No `Math.random()` in `src/sim`.
* Physics, collisions and learning live in plain JS modules with no DOM or React imports.
* Rendering speed (1x, 20x, Turbo) only changes how many ticks run per frame. It never changes the result.

---

## 5. Simulation model

World units are abstract "metres". Cars are drawn larger than real scale so they are readable. The numbers below are **starting values to tune**, not fixed truth. Put them all in `src/constants.js`.

| Item | Starting value |
|---|---|
| Physics rate | 60 ticks per second |
| Decision step | 12 ticks (0.2s) |
| Car length / width | 6 / 3.2 |
| Oval track width | 28 |
| F1 style track width | 20 to 24 |
| Max speed | 45 per second |
| Minimum speed (cars cannot stop themselves) | 8 per second |
| Acceleration / braking | 18 / 30 per second squared |
| Drag | small, proportional to speed |

**Steering.** Use a grip limit so that speed matters and corners teach braking:

```
omega = steer * min(omegaMax, aLatMax / max(speed, speedFloor))
```

With `steer` in -1, 0, 1. Start with `omegaMax = 1.2` radians per second and `aLatMax = 20`. Tune so that the oval can be taken at full speed with steady steering, but a tight hairpin forces the car to brake first. If that is not true after tuning, the later tracks will not teach anything.

**Collision shapes.** Represent each car as three circles along its length. Track edge test: for each circle, work out the signed lateral offset from the centreline; the car has hit the edge if `abs(offset) + radius > halfWidth`. Car to car: any circle overlap. Stopped cars remain as obstacles.

**Where is the car on the track?** Precompute the centreline as evenly spaced samples (about every 3 units) with cumulative distance. For each car, find the nearest sample **within a window around its last known index**, never by searching the whole list. A full search breaks at hairpins and where two parts of the track run close together.

**Start grid.** Two columns of three, staggered, behind the start line, all facing along the track. Positions are fixed per car for the whole app. Do not rotate the grid between rounds: the learned routes depend on the start position. (This is itself a teaching point. See "Ask the class" in section 7.)

**Timing and rendering.**

* The sim runs in a fixed step loop driven by `requestAnimationFrame`, using an accumulator. Speed multiplies ticks per frame.
* Draw positions interpolated between the last two ticks for smooth movement at 1x.
* The React UI reads from the sim through a small store and `useSyncExternalStore`, updated at most about 10 times a second. React must not re-render on every frame. The canvas reads sim state directly.
* Cap `devicePixelRatio` at 2.
* Performance targets: 60 frames per second at 1x with six cars on a school laptop with integrated graphics. At Turbo on the oval, at least 20 rounds per second once cars survive for a full lap.

---

## 6. Tracks

### 6.1 Format

Each track is a data file in `src/tracks/`. The runtime builds the road, edges, kerbs and centre samples from the data.

```js
/**
 * @typedef {Object} TrackDef
 * @property {string}   id          Short id, for example 'oval'.
 * @property {string}   name        Display name.
 * @property {string}   inspiredBy  Plain text, for the About panel.
 * @property {number}   width       Full road width in world units.
 * @property {[number, number][]} points  Control points of a closed Catmull-Rom spline, in driving order.
 * @property {number}   startIndex  Index of the control point where the start line sits.
 * @property {number}   difficulty  1 (easy) to 5 (hard), used for ordering.
 * @property {string}   lessonNote  One or two plain sentences on what this track teaches.
 */
```

Write `scripts/validateTracks.js` to check every track: closed loop, no self-crossing, minimum curvature radius larger than half the road width, and a sensible length. Run it as `npm run validate:tracks`.

### 6.2 Track list

* **Phase 1:** Speedway Oval (Indy 500 style). Long straights, four wide corners. Lesson note: "A forgiving track. The cars can learn it with simple steering."
* **Phase 2:** simplified layouts inspired by Monza, Interlagos, Barcelona, Silverstone, Brands Hatch and Spa-Francorchamps, in that difficulty order. Monza has long straights and heavy braking zones. Interlagos has frequent direction changes. Barcelona balances fast and slow corners. Silverstone rewards smooth steering through fast sweepers. Brands Hatch pairs flowing sweepers at one end with a tight hairpin at the other. Spa mixes very high speed sections with technical corners. Names arte subtly changed to avoid copyright issues.
* **Suzuka**, built as the sixth Phase 2 track rather than deferred: a simple closed loop, not an actual figure-of-eight, so it needs no bridge in the collision model. It is the narrowest and tightest of the set, by design the hardest.

These are **schematic, hand authored approximations**, drawn from the general shape of each circuit, not traced from any map and not to scale. Do not use any Formula 1 logo, trademark artwork, sponsor name or official map. Label them "inspired by" in the UI. Elevation changes are not modelled.

Learned routes are stored **per track**. Switching track shows a fresh set of cars for that track. Returning to an earlier track restores its progress.

---

## 7. Teaching content

All teaching text lives in `src/content/concepts.js` as plain data, so I can edit it without touching components.

### 7.1 Writing rules

* UK English. Short, direct sentences, mixed with the occasional longer one. Reading level suitable for a Level 2 student.
* Plain words first. Introduce the correct term after the plain explanation, in **bold**, the first time it appears.
* No em dashes. Avoid padded, stock phrasing.
* Each concept has: `title`, `level` tag (`L2`, `L3` or `T`) for my own mapping later, `plain` (2 to 4 sentences), `deeper` (the Level 3 detail, hidden behind a "Go deeper" button), `ask` (one discussion question for the class), and `trigger` (the event that unlocks it).

### 7.2 Concept list

1. The agent and the environment (the car and the track).
2. Actions: nine possible moves.
3. Reward: distance as a score.
4. Trial and error, and the **episode** (a round).
5. Exploring and exploiting: replaying what works against trying something new.
6. Why rewind before the crash (blame is not always where the crash is).
7. Backtracking when stuck.
7a. Two goals, not one: surviving and being quick (the efficiency phase, section 4.3a).
8. The learning curve (reading the chart).
9. Randomness, seeds and why runs differ.
10. Other cars as part of the environment.
11. Why six independent learners give six different results.
12. It only works on this track (overfitting, in its simplest form).
13. Sensors and neural networks (unlocked in Phase 3).
14. Weights and mutation (Phase 3).
15. Why the sensor cars can try a new track (Phase 3).

Here are three samples to set the tone. Write the rest to match.

**Trial and error** (`L2`)
*Plain:* At the start, the car knows nothing. It tries a move, sees what happens, and remembers. If it crashes, that choice goes on the "don't do that again" list. Each round is one attempt from the start line to the crash.
*Deeper:* One attempt from start to finish is called an **episode**. The car's score for an episode is its **reward**, here the distance it covered. Learning means using the rewards from past episodes to pick better actions in future ones.
*Ask the class:* Why do the cars start in exactly the same place every round?

**Why rewind before the crash** (`L2`)
*Plain:* The wall is not always to blame. A move a few steps earlier may have pointed the car at the wall for good. So the car goes back a little before the crash and changes its mind there. If that keeps failing, it goes back further.
*Deeper:* This is the **credit assignment problem**: deciding which earlier decision deserves the blame for a later result. Rewinding is a simple, visible way to handle it. Real systems use methods such as temporal difference learning, which spread the blame across many earlier steps at once.
*Ask the class:* Can you think of a time a small mistake early on caused a big problem later?

**It only works on this track** (`L2`)
*Plain:* The cars have memorised a list of moves that suits this one track. Change the track and the list is useless. A skill that carries over to new places would be much more useful.
*Deeper:* A model that does very well on the data it trained on and badly on anything new is **overfitting**. Here the "model" is a stored route, so it is overfitted by design. The sensor cars in Phase 3 try to learn a skill instead of a route.
*Ask the class:* What would a car need to know in order to drive a track it has never seen?

### 7.3 Honesty about what this is

Phase 1 is not a neural network and not deep learning. It is a trial and error search with a memory, a close relative of hill climbing and backtracking. The cars really do improve with experience, so it is a fair introduction to the ideas of reward, exploration and learning from failure. But the app must say plainly, in the About drawer and in the "Go deeper" text, how it differs from the systems behind speech recognition or chatbots. Do not call the stored route a "brain" in the teaching text (the Brain drawer name is fine as a friendly label). Do not claim the cars "understand" the track.

---

## 8. Architecture and file layout

Follow the structure created by `npm create vite@latest` (React, JavaScript). React code in the project root, as `CLAUDE.md` says.

```
mlcars/
  index.html
  package.json
  vite.config.js
  .htaccess
  README.md
  public/
    favicon.png
    cc-by-nc-sa.png            (CC badge, saved locally)
  src/
    main.jsx
    App.jsx
    index.css                  (the only stylesheet)
    cmFloatAd.jsx              (college branding, see section 12)
    constants.js
    sim/                       (no React, no DOM)
      rng.js
      actions.js
      geometry.js
      track.js                 (builds road, edges, centre samples from a TrackDef)
      physics.js
      collisions.js
      routeBrain.js            (phase 1 learning)
      neuralBrain.js           (phase 3 learning)
      world.js                 (round loop, car states, events)
      persistence.js
    tracks/
      index.js
      oval.js
      (more in phase 2)
    render/                    (canvas drawing only)
      palette.js               (reads CSS variables into a plain object)
      trackLayer.js
      carSprite.js
      effects.js
      overlays.js              (learned lines, crash marks, sensor rays)
    ui/
      Toolbar.jsx
      TrackCanvas.jsx
      CarRail.jsx
      Drawer.jsx
      BrainDrawer.jsx
      ActionGrid.jsx
      RouteStrip.jsx
      RoundReport.jsx
      LearningChart.jsx
      Commentary.jsx
      ConceptsDrawer.jsx
      SettingsDrawer.jsx
      AboutDrawer.jsx
      icons.jsx
    content/
      concepts.js
    hooks/
      useWorld.js
      useReducedMotion.js
  scripts/
    validateTracks.js
```

**Important rules**

* `src/sim` imports nothing from `react`, the DOM or `src/ui`. This keeps the engine testable and lets us move it into a Web Worker later without a rewrite.
* The world emits **events** (round started, car reached rewind point, car crashed, round ended, new best). The commentary, concept unlock notices and pause switches all subscribe to these events. Do not build them by polling sim state.
* Canvas colours come from CSS variables (see section 10), read through `render/palette.js` at start and whenever the colour scheme changes. No hex values in JavaScript.
* Windows and drawers position through CSS classes. An inline style is allowed only for a truly dynamic value (for example a computed width in the whole route bar).

---

## 9. Saving and loading

* `localStorage` key `mlcars.v1`, wrapped in `try/catch` (storage can be missing or full).
* Stored shape: settings, then for each track: seed, round count, the six lineages, and a **history** of best distance per car per round for the chart. Cap history at 5000 rounds and thin out the oldest points when it grows past that.
* Include a `version` field so the format can change safely.
* **Export** downloads a `.json` file. **Import** accepts one, validates it, and refuses anything with a different major version.
* Save at the end of every round, not every step.
* Reset learning clears the current track only, after a confirmation. It does not touch settings.

---

## 10. CSS and tokens

Follow all CSS rules in `CLAUDE.md`: one stylesheet, `src/index.css`; all values as variables in `:root`; BEM-ish class names; mobile first with breakpoints at 600, 900 and 1200px; flexbox preferred; respect `prefers-reduced-motion` and `prefers-color-scheme`.

Keep the token names in `CLAUDE.md`. The values are "edit to taste", and a cartoon look needs more punch than the defaults, so adjust them. Use the `design:design-system` skill when you do. Add these tokens:

```
--colour-ink            thick outline colour, near black
--outline-width         3px
--shadow-sticker        hard offset, no blur, drawers and primary button only
--colour-grass-a / -b   two grass stripe colours
--colour-tarmac, --colour-kerb-red, --colour-kerb-white, --colour-line
--car-1 ... --car-6     six car colours, chosen to be distinguishable for common colour blindness
--car-1-ink ... --car-6-ink   text or number colour that passes contrast on each car colour
--space-16, --space-24  (only if the layout needs them)
```

Suggested car colours come from the Okabe and Ito colour blind safe set (vermillion, sky blue, bluish green, yellow, blue, reddish purple). Check contrast for every pairing used for text, to the 4.5:1 minimum in `CLAUDE.md`.

Dark mode: the scheme changes the chrome and the scenery (a dusk or night track), not the car colours.

Reduced motion: no orbiting stars, no poof animation, pupils do not move, the "Concept unlocked" notice appears without sliding. The cars still drive, because that is the content, but the app should open **paused** with a clear play button when reduced motion is on.

---

## 11. Accessibility

The minimums in `CLAUDE.md` all apply. Additional points for this app:

* The canvas is `role="img"` with an `aria-label` that is refreshed about every two seconds with a short summary, for example "Round 12, step 38. Car 2 leads at 412 metres. Cars 3 and 5 have stopped." Everything the canvas shows is also available in text in the Commentary and Round report drawers.
* Commentary has an `aria-live="polite"` region, throttled as in section 3.3. Provide a toggle to silence it.
* Selecting a car works from the car chips and by keyboard. Never rely on clicking the canvas.
* Every control is a real `button`, `input` or `label` and is reachable by Tab in a sensible order. `Esc` closes a drawer and returns focus to the button that opened it.
* Keyboard shortcuts (shown in a help list in Settings): `Space` play or pause, `.` step, `1` to `6` select car, `R` open the Round report. Shortcuts are ignored while typing in a field.
* The action grid, route strip and chart each have a text equivalent for the current state.
* Nothing flashes more than three times a second. Crash effects are short and small.
* Touch targets at least 44 by 44px, including the car chips and toolbar buttons.
* Never show state with colour alone. Locked, new and crashed route tiles differ by outline style and glyph as well as colour. Cars differ by number and pattern.

Run the `design:accessibility-review` skill before calling any screen finished and give me the list of fixes.

---

## 12. Branding, licence and hosting

**College branding.** This is a College/Educational app, so copy `C:\Users\simonrundell\OneDrive - Exeter College\Development\cmFloatAd.jsx` into `/src` and import it in `App.jsx` so it shows on every page. If `src/cmFloatAd.jsx` already exists, I added it by hand: leave it exactly as it is. Position it so it never covers the toolbar or the car rail at 375px.

**Favicon.** I usually add `public/favicon.png` when scaffolding. If it is there, use it as the app icon in the page title area and in `index.html`:

```html
<link rel="icon" type="image/png" href="/favicon.png" />
```

If it is missing, tell me and carry on with a placeholder.

**Licence.** CC BY-NC-SA 4.0 International. Put a short licence section in `README.md` and in the About drawer, with this precis: *You may share and adapt this work with credit, for non-commercial use only, and adaptations must carry the same licence.* Link to the full terms at https://creativecommons.org/licenses/by-nc-sa/4.0/ and include the matching CC badge. Save the badge image locally in `public/cc-by-nc-sa.png`. If you cannot download it, ask me for the file rather than hot-linking.

**Hosting.** Hostinger, Apache. Production build with `npm run build`, upload the contents of `dist/`. The dev machine does not read `.htaccess`, but write it for the live Apache server. Root `.htaccess`:

```apache
RewriteEngine On

# Let real files/directories (including /api/*) resolve normally.
RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]

# Everything else falls back to index.html so React Router can handle
# client-side routes (e.g. a hard refresh).
RewriteRule ^ index.html [L]

# Never expose configuration files.
<FilesMatch "^\.config\.json$">
  Require all denied
</FilesMatch>
```

The app is mounted at the site root unless I say otherwise. If you think a sub-folder deployment is likely, ask me before changing `base` in `vite.config.js`.

**Scaffolding.** When you create the project, run `npx -y react-doctor@latest install` straight after `npm create vite@latest`. That command is pre-approved.

---

## 13. Phases and gates

Stop at the end of each phase and wait for me.

### Phase 0: scaffold and direction

* Vite React JavaScript project, folder layout from section 8, react-doctor installed, favicon, `cmFloatAd.jsx`, `.htaccess`, `README.md` with licence.
* Tokens in `index.css`.
* State the visual direction in two or three sentences. **Wait for my nod.**

*Done when:* the empty app builds and runs, branding is visible at 375px and 1280px, and I have agreed the direction.

### Phase 1: one oval, six cars, learning that works

* Headless engine: actions, physics, track builder, collisions, world loop, route brain, seeded RNG.
* Speedway Oval.
* Canvas rendering with the cartoon cars, cached track layer, learned lines.
* Toolbar (play, pause, step, speeds, restart, reset), car chips.
* Brain drawer, Round report drawer, Settings drawer.
* Saving and loading.

*Done when:*

* All six cars drive, stop on a wall or a car, and the next round starts when all have stopped.
* A fixed seed reproduces the same history twice (report the numbers you saw).
* At Turbo, cars complete the lap target on the oval. **Report how many rounds and how many seconds that took, per car.** If it takes more than about five minutes, propose tuning to `stickiness`, `patience` and the physics constants before moving on.
* Smoke test list in section 14 passes.

### Phase 2: teaching layer and more tracks

* Learning chart, Commentary, Concepts drawer with all concept cards for Phases 1 to 2, Concept unlocked notices, Go deeper buttons.
* Pause switches (new choice, crash, round end).
* Mobile layout at 375px with bottom sheets.
* Five or six F1 inspired tracks, with `validate:tracks` passing.
* Export and import.
* Accessibility review and fixes.

*Done when:* a student can open the app, press play, and follow what each car decided and why, without me explaining the screen.

### Phase 3: sensors and neural network cars

A second mode, chosen from the toolbar, that sits alongside route learning.

* **Sensors.** Seven rays from the front of the car (angles about -90, -45, -20, 0, 20, 45 and 90 degrees), each returning distance to the track edge as a number from 0 to 1, plus current speed. Optionally the nearest car ahead. Draw the rays on the track for the selected car.
* **Network.** A small fully connected network, for example 8 inputs, 8 hidden nodes (tanh) and 2 outputs (throttle and steer). Convert each output to one of three values with thresholds, so the car still picks one of the same nine actions and every drawer keeps working.
* **Learning.** Independent lineages again, by **mutation and selection**: each round a car runs with its parent weights plus small random changes. If it travels further than the parent, the child becomes the parent. Because a network reacts to what its sensors see, there is no replay and no rewind in this mode.
* **Brain drawer for networks.** Live view of the sensor values, the nodes lit by their activation, and connection lines drawn thicker for larger weights. Weights are only shown as picture and number, never explained as "thinking".
* **Transfer test.** A button that puts the current cars on a different track with learning switched off. Route cars fail almost at once. Sensor cars should do much better. This is the lesson.
* Concepts 13 to 15 become available.

*Done when:* sensor cars learn the oval, and the transfer test visibly shows the difference. Six independent hill climbers may learn slowly. Measure it. If it is too slow to be useful in a lesson, **do not change the lineage rule yourself**. Report the numbers and propose options at the gate.

**Built, with measured numbers reported rather than any change to the lineage rule** (see `PROGRESS.md` for the full write-up):

* Learning the oval is fast: all six independent hill climbers reached the full 3-lap target in 194-368 rounds (7-16 seconds of headless Turbo-equivalent compute) across three seeds tried. No slowness concern - nothing to report at a gate here.
* The transfer test's "visibly shows the difference" is real but **track-dependent**, not universal. Oval-trained networks transferred to Monza (a similarly-shaped wide stadium track) averaged ~127m vs ~17m for a fresh random network - a clear, dramatic difference. Transferred to Suzuka (tight, asymmetric, a hairpin at one end) they did not beat a fresh random network at all. Training on one easy, symmetric track teaches a skill that generalises to similar shapes, not to every shape - which is itself an honest teaching point (see concept 15's "Go deeper"), but means the demo is more convincing with some target tracks than others. Monza is a good one to pick for a first demonstration.
* Nine inputs used (7 rays + speed + nearest car ahead), per your go-ahead to include the optional nearest-car sensor from the start.
* The mode switch (Route cars / Sensor cars) works like the track picker: each (track, mode) pair keeps its own independently saved progress.

### Phase 4: ideas for later, do not build

* Floating, draggable windows with a keyboard alternative.
* A "Predict" feature: before a round, the student guesses whether a car will go further, then sees the result.
* Replay of a car's best lap with a follow camera.
* Teacher lock for settings.
* A Web Worker for the engine.
* A track sketch tool.

---

## 14. Smoke test checklist

I run the full tests. You only run these quick checks, and report each as pass or fail. Run them against the running instance, in a browser, at 375px and 1280px.

* `npm run build` finishes without errors or warnings that matter.
* The page loads with no console errors.
* Press play: six cars move, a car that touches the edge stops and stays, a car that touches another stops with it.
* When the last car stops, the next round starts on its own.
* Open and close each drawer with the keyboard. Focus returns to the button that opened it.
* Selecting each car chip changes the Brain drawer.
* Reload the page: progress on the current track is still there.
* Reset learning asks for confirmation.
* The licence text, link and badge are visible in About.

Optional, for my approval first: a tiny `scripts/checkDeterminism.js` that runs the same seed twice headlessly for 50 rounds and compares the histories. It costs almost nothing and protects the most fragile requirement in the app. Ask before adding it.

Do not write large end to end test suites unless I ask for one.

---

## 15. Out of scope for now

* Accounts, logins, a server, a database, leaderboards.
* Audio.
* Real physics (tyre models, slip, aerodynamics).
* Official track maps, F1 branding or sponsor names.
* Any use of an external AI service. The "learning" is all local and visible.

---

## 16. Things I will want to decide at gates

* The six car names, once I have seen the faces.
* The exact wording on the About page.
* Which track(s) to feature as the default Transfer test demo, given Monza shows the lesson clearly but Suzuka does not (section 13).
