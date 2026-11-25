/**
 * Tunable defaults for the simulation. Nothing here is fixed truth: these
 * are starting values to tune (BUILD.md section 5). Settings drawer values
 * override the learning-related ones per track session; the rest are
 * physics/world constants shared by every track.
 */

/** Physics ticks per second. Fixed step, never wall-clock delta. */
export const TICKS_PER_SECOND = 60;

/** Ticks per decision step (0.2s per step). */
export const TICKS_PER_STEP = 12;

/** Seconds represented by one decision step. */
export const STEP_SECONDS = TICKS_PER_STEP / TICKS_PER_SECOND;

/** Car footprint, in world units ("metres"). */
export const CAR_LENGTH = 6;
export const CAR_WIDTH = 3.2;

/** Speed bounds, world units per second. */
export const MAX_SPEED = 45;
export const MIN_SPEED = 8;

/** Acceleration / braking, world units per second squared. */
export const ACCEL = 18;
export const BRAKE = 30;

/** Drag coefficient: deceleration = DRAG * speed (per second squared per unit speed). */
export const DRAG = 0.05;

/** Steering grip limit (BUILD.md 5): omega = steer * min(omegaMax, aLatMax / max(speed, speedFloor)). */
export const OMEGA_MAX = 0.5;
export const A_LAT_MAX = 20;
export const SPEED_FLOOR = 4;

/** Centreline sampling spacing, world units. */
export const CENTRELINE_SAMPLE_SPACING = 3;

/** Window (in samples either side) used when locating a car's nearest centreline sample. */
export const NEAREST_SAMPLE_WINDOW = 12;

/** Distance (world units) backwards along the track before a car is ruled "wrong way". */
export const WRONG_WAY_DISTANCE = 15;

/** Learning defaults (Settings drawer, section 4.6). */
export const DEFAULT_BASE_REWIND = 1;
export const DEFAULT_PATIENCE = 3;
export const DEFAULT_STICKINESS = 0.6;
export const DEFAULT_LAP_TARGET = 3;
export const DEFAULT_COLLISIONS_ON = true;
export const DEFAULT_SHOW_LEARNED_LINES = true;
export const DEFAULT_SHOW_CRASH_MARKS = false;
export const DEFAULT_ROUND_PAUSE_SECONDS = 1.5;
/** Once a lineage has banked a lap, accept a round that matches its best distance in fewer steps (BUILD.md 4.3a). */
export const DEFAULT_OPTIMIZE_FOR_SPEED = true;
/** Steps to jump back in one go when recent crashes at a rewind point cluster in the same spot (BUILD.md 4.3). */
export const DEFAULT_BIG_REWIND_JUMP = 2;

/** Settings ranges, for the Settings drawer inputs. */
export const SETTINGS_RANGES = {
  baseRewind: { min: 1, max: 5, step: 1 },
  patience: { min: 1, max: 6, step: 1 },
  stickiness: { min: 0, max: 0.9, step: 0.05 },
  lapTarget: { min: 1, max: 10, step: 1 },
  roundPauseSeconds: { min: 0, max: 5, step: 0.5 },
  bigRewindJump: { min: 1, max: 5, step: 1 },
  mutationSigma: { min: 0.05, max: 1, step: 0.05 },
};

/** Minimum fraction of max speed a crawling car is assumed able to hold, for the round step limit formula. */
export const MIN_SPEED_FRACTION_FOR_LIMIT = 0.4;

/**
 * Work out the round step limit so a crawling car cannot survive forever.
 * roundStepLimit = ceil(trackLength * lapTarget / (0.4 * maxSpeed * stepSeconds))
 *
 * @param {number} trackLength World units for one lap of the centreline.
 * @param {number} lapTarget Laps required to finish.
 * @returns {number} Maximum decision steps allowed in a round.
 */
export function roundStepLimit(trackLength, lapTarget) {
  return Math.ceil(
    (trackLength * lapTarget) / (MIN_SPEED_FRACTION_FOR_LIMIT * MAX_SPEED * STEP_SECONDS)
  );
}

/** Playback speed multipliers (ticks run per animation frame, roughly). */
export const SPEED_OPTIONS = [
  { id: '1x', label: '1x', ticksPerFrame: 1 },
  { id: '2x', label: '2x', ticksPerFrame: 2 },
  { id: '5x', label: '5x', ticksPerFrame: 5 },
  { id: '20x', label: '20x', ticksPerFrame: 20 },
  { id: 'turbo', label: 'Turbo', ticksPerFrame: 0 }, // 0 = frame-budget driven
];

/** Turbo mode's per-frame time budget, in milliseconds. */
export const TURBO_FRAME_BUDGET_MS = 10;

/** devicePixelRatio cap for crisp-but-cheap canvas rendering. */
export const MAX_DEVICE_PIXEL_RATIO = 2;

/**
 * @typedef {Object} CarIdentity
 * @property {number} index 0-based car index, also used to derive its RNG stream.
 * @property {number} number Car number shown on the roof (1-based, matches index + 1).
 * @property {string} name Display name.
 * @property {string} colourVar CSS variable name holding this car's body colour.
 * @property {string} inkVar CSS variable name holding this car's contrasting ink/text colour.
 * @property {'plain'|'stripe'|'spots'|'chevron'|'checks'|'hoops'} pattern Visual pattern, so identity never depends on colour alone.
 */

/** @type {CarIdentity[]} */
export const CARS = [
  { index: 0, number: 1, name: 'Rusty', colourVar: '--car-1', inkVar: '--car-1-ink', pattern: 'plain' },
  { index: 1, number: 2, name: 'Zippy', colourVar: '--car-2', inkVar: '--car-2-ink', pattern: 'stripe' },
  { index: 2, number: 3, name: 'Bolt', colourVar: '--car-3', inkVar: '--car-3-ink', pattern: 'spots' },
  { index: 3, number: 4, name: 'Dot', colourVar: '--car-4', inkVar: '--car-4-ink', pattern: 'chevron' },
  { index: 4, number: 5, name: 'Sprocket', colourVar: '--car-5', inkVar: '--car-5-ink', pattern: 'checks' },
  { index: 5, number: 6, name: 'Pip', colourVar: '--car-6', inkVar: '--car-6-ink', pattern: 'hoops' },
];

/** Number of cars. Kept as a constant rather than CARS.length sprinkled everywhere. */
export const CAR_COUNT = CARS.length;

/** Start grid: two columns of three, staggered, behind the start line (BUILD.md 5). Offsets in world units, +x along track direction (backwards), +y lateral. */
export const START_GRID_OFFSETS = [
  { forward: 0, lateral: -4.5 },
  { forward: 0, lateral: 4.5 },
  { forward: -9, lateral: -4.5 },
  { forward: -9, lateral: 4.5 },
  { forward: -18, lateral: -4.5 },
  { forward: -18, lateral: 4.5 },
];

/** localStorage key and current save format version (BUILD.md section 9). Bumped for Phase 3's per-mode save shape. */
export const SAVE_KEY = 'mlcars.v1';
export const SAVE_VERSION = 2;

/** Cap on stored history points (best distance per round per car) before thinning. */
export const HISTORY_CAP = 5000;

/**
 * Phase 3: sensors and neural network cars (BUILD.md section 13).
 */

/** Learning mode: 'route' (Phase 1-2) or 'sensor' (Phase 3). */
export const DEFAULT_MODE = 'route';

/** Forward sensor rays, degrees relative to heading, left to right. Matches the steer convention: positive = the "right" side (BUILD.md 13). */
export const SENSOR_RAY_ANGLES_DEG = [-90, -45, -20, 0, 20, 45, 90];

/** How far a sensor ray or the nearest-car check looks, in world units, before reporting "clear" (normalized reading of 1). */
export const SENSOR_MAX_RANGE = 40;

/** March step size when casting a ray against the track edge, world units. Smaller is more precise and a little more work. */
export const SENSOR_RAY_STEP = 2;

/** Window (in samples either side) for the windowed track-location lookup a sensor ray reuses at each march step. */
export const SENSOR_SEARCH_WINDOW = 10;

/** Network shape (BUILD.md 13): 7 rays + speed + nearest-car-ahead = 8, hidden (tanh), throttle+steer outputs (tanh). */
export const NETWORK_INPUT_SIZE = SENSOR_RAY_ANGLES_DEG.length + 2;
export const NETWORK_HIDDEN_SIZE = 8;
export const NETWORK_OUTPUT_SIZE = 2;

/** Standard deviation of the gaussian noise used to randomly initialise a fresh network's weights. */
export const NETWORK_INIT_SIGMA = 0.6;

/** Default standard deviation of the mutation applied to a parent's weights each round (Settings drawer). */
export const DEFAULT_MUTATION_SIGMA = 0.3;
