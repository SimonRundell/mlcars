/**
 * Phase 1 learning: move-sequence learning with rewind and backtracking
 * (BUILD.md section 4). Deliberately free of React and the DOM so it can
 * run headless, in tests, or later inside a Web Worker without a rewrite.
 *
 * Teaching note: do not call this a neural network anywhere in UI text.
 * It is a trial-and-error search with memory, honestly described in the
 * About drawer and the "It only works on this track" concept card.
 */

import { ACTIONS, ACTION_COUNT } from './actions.js';
import { next, randomInt } from './rng.js';

/** Crash locations (BUILD.md 4.3) within this many world units of each other count as "the same spot". */
export const CRASH_LOCATION_TOLERANCE = 6;

/**
 * Whether every location in `locations` sits within `tolerance` of the
 * first one, measured the short way round the closed track (so a crash
 * just before the start line and one just after it still count as the
 * same spot).
 *
 * @param {number[]} locations Distances already taken mod trackLength.
 * @param {number} trackLength
 * @param {number} tolerance
 * @returns {boolean}
 */
function allNearFirst(locations, trackLength, tolerance) {
  if (locations.length < 2) return false;
  const [first, ...rest] = locations;
  return rest.every((loc) => {
    const diff = Math.abs(loc - first);
    return Math.min(diff, trackLength - diff) <= tolerance;
  });
}

/**
 * @typedef {Object} Lineage
 * @property {number[]} best Best route found so far (action indices, up to and including the crash step).
 * @property {number} bestDistance Distance reached by that route, in metres of track.
 * @property {number} rewind How many steps before the crash to go back (starts at baseRewind).
 * @property {number} failures Rounds in a row from this rewind point that did not beat bestDistance.
 * @property {Object<number, number[]>} tried Action indices already tried at each rewind step index.
 * @property {Object<number, number[]>} crashLocations Stop locations (distance mod trackLength) for each failed attempt at each rewind step index, used to spot a car stuck crashing in the same spot (BUILD.md 4.3).
 * @property {number} lapsDone Laps completed in the best attempt.
 * @property {boolean} finished True once the lap target is reached.
 * @property {number} bestRound Round number (1-based) when `best` was last set, for "Remembered from round N" text.
 */

/**
 * A fresh lineage with no history yet.
 *
 * @param {number} baseRewind Starting rewind distance (Settings drawer value).
 * @returns {Lineage}
 */
export function createLineage(baseRewind) {
  return {
    best: [],
    bestDistance: 0,
    rewind: baseRewind,
    failures: 0,
    tried: {},
    crashLocations: {},
    lapsDone: 0,
    finished: false,
    bestRound: 0,
  };
}

/**
 * The step index this lineage will rewind to for its next round: the
 * locked prefix runs from step 0 up to (but not including) this index.
 *
 * @param {Lineage} lineage
 * @returns {number}
 */
export function rewindStepFor(lineage) {
  return Math.max(0, lineage.best.length - lineage.rewind);
}

/**
 * @typedef {Object} RoundResult
 * @property {number[]} route Actions actually taken this round, one per decision step, up to and including the step that ended the round.
 * @property {number} distance Reward: metres of track covered (laps * trackLength + distanceAlongLap).
 * @property {number} lapsDone Laps completed this round.
 * @property {boolean} finished Whether this round reached the lap target.
 * @property {number|null} matchStep The decision step at which this round's distance first reached the lineage's bestDistance as it stood at the start of the round, or null if it never did.
 */

/**
 * @typedef {Object} PlanOptions
 * @property {number} baseRewind
 * @property {number} patience
 * @property {boolean} optimizeForSpeed Whether the efficiency phase (BUILD.md 4.3a) is switched on.
 * @property {number} bigRewindJump How many steps to jump back in one go when recent crashes at this rewind step all land in the same spot, instead of the usual +1 (BUILD.md 4.3).
 * @property {number} trackLength Needed to compare crash locations across laps (distance is taken mod trackLength).
 */

/**
 * Work out this lineage's next state after one round, per BUILD.md 4.3.
 * A car that has already finished keeps its lineage unchanged: it stops
 * learning until the lap target is raised.
 *
 * @param {Lineage} lineage Lineage as it stood for the round that just ended.
 * @param {RoundResult} result What happened in that round.
 * @param {PlanOptions} options
 * @param {number} roundNumber The round number that just finished (1-based), for bestRound bookkeeping.
 * @returns {Lineage} The lineage to use for the next round.
 */
export function planNextRound(lineage, result, options, roundNumber) {
  if (lineage.finished) return lineage;

  const rewindStep = rewindStepFor(lineage);

  if (result.distance > lineage.bestDistance) {
    return {
      best: result.route.slice(),
      bestDistance: result.distance,
      rewind: options.baseRewind,
      failures: 0,
      tried: {},
      lapsDone: result.lapsDone,
      finished: result.finished,
      bestRound: roundNumber,
    };
  }

  // Efficiency phase (BUILD.md 4.3a): once a lineage has banked at least
  // one lap, a round that reaches the same distance in fewer steps wins
  // too, even though it did not go any further. `best.length` doubles as
  // "fewest steps known to reach bestDistance", so the record route only
  // ever gets shorter from here, never longer, until distance improves
  // again above.
  if (
    options.optimizeForSpeed &&
    lineage.lapsDone >= 1 &&
    result.matchStep != null &&
    result.matchStep < lineage.best.length - 1
  ) {
    return {
      best: result.route.slice(0, result.matchStep + 1),
      bestDistance: lineage.bestDistance,
      rewind: options.baseRewind,
      failures: 0,
      tried: {},
      lapsDone: lineage.lapsDone,
      finished: false,
      bestRound: roundNumber,
    };
  }

  let failures = lineage.failures + 1;
  const tried = { ...lineage.tried };
  if (result.route.length > rewindStep) {
    const actionAtRewind = result.route[rewindStep];
    const existing = tried[rewindStep] ? tried[rewindStep].slice() : [];
    if (!existing.includes(actionAtRewind)) existing.push(actionAtRewind);
    tried[rewindStep] = existing;
  }

  const crashLocations = { ...lineage.crashLocations };
  const crashLocation = ((result.distance % options.trackLength) + options.trackLength) % options.trackLength;
  const existingLocations = crashLocations[rewindStep] ? crashLocations[rewindStep].slice() : [];
  existingLocations.push(crashLocation);
  crashLocations[rewindStep] = existingLocations;

  let rewind = lineage.rewind;
  const triedCount = tried[rewindStep] ? tried[rewindStep].length : 0;
  if (failures >= options.patience || triedCount >= ACTION_COUNT) {
    // Backtracking (BUILD.md 4.3): if every recent attempt from this
    // rewind point died in much the same spot - regardless of which
    // action was tried there - the real fork in the road was earlier
    // still, so jump back several steps in one go rather than nudging
    // the rewind point by one and waiting for patience to run out again.
    const sameSpot = allNearFirst(existingLocations, options.trackLength, CRASH_LOCATION_TOLERANCE);
    rewind += sameSpot ? options.bigRewindJump : 1;
    failures = 0;
    // Start the next patience-cycle's location tracking fresh. Without
    // this, a lineage stuck at the same rewind step for hundreds of
    // rounds (most commonly once rewindStep floors at 0) would keep
    // appending to the same array forever, diluting the "same spot"
    // check with increasingly stale history and growing without bound.
    delete crashLocations[rewindStep];
  }

  return {
    ...lineage,
    failures,
    tried,
    crashLocations,
    rewind,
  };
}

/**
 * @typedef {Object} Decision
 * @property {number} actionIndex 0 to 8.
 * @property {'locked'|'new'|'explore'} source
 */

/**
 * Decide the action for one step of one round, given the lineage's plan
 * for this round and what happened on the immediately previous step.
 *
 * @param {Lineage} lineage
 * @param {number} rewindStep Result of rewindStepFor(lineage), passed in so callers compute it once per round.
 * @param {number} step 0-based decision step index within the round.
 * @param {number|null} prevActionIndex Action taken at step - 1, or null if step is 0.
 * @param {import('./rng.js').RngStream} stream This car's own RNG stream. Mutated in place.
 * @param {number} stickiness Probability of repeating prevActionIndex once exploring (Settings drawer value).
 * @returns {Decision}
 */
export function decideAction(lineage, rewindStep, step, prevActionIndex, stream, stickiness) {
  if (step < rewindStep) {
    return { actionIndex: lineage.best[step], source: 'locked' };
  }

  if (step === rewindStep) {
    const triedHere = lineage.tried[rewindStep] || [];
    const untried = [];
    for (let i = 0; i < ACTION_COUNT; i++) {
      if (!triedHere.includes(i)) untried.push(i);
    }
    const pool = untried.length > 0 ? untried : ACTIONS.map((a) => a.index);
    const actionIndex = pool[randomInt(stream, pool.length)];
    return { actionIndex, source: 'new' };
  }

  if (prevActionIndex != null && next(stream) < stickiness) {
    return { actionIndex: prevActionIndex, source: 'explore' };
  }
  return { actionIndex: randomInt(stream, ACTION_COUNT), source: 'explore' };
}
