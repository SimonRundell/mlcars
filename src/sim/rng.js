/**
 * Seeded random number generation (mulberry32). No module in src/sim may
 * call Math.random() directly: every random choice must come from a
 * stream created here, so that a given seed always reproduces the same
 * history (BUILD.md section 4.7).
 *
 * A stream is a small mutable object `{ a }` rather than a bare closure,
 * so its state can be read and cloned - needed to make "Restart round"
 * replay a round exactly, by snapshotting each car's stream at the start
 * of a round and restoring it if that round is restarted.
 */

/**
 * @typedef {Object} RngStream
 * @property {number} a Internal mulberry32 state (32-bit).
 */

/**
 * Create a new stream from a 32-bit integer seed.
 *
 * @param {number} seed Any integer; only the low 32 bits are used.
 * @returns {RngStream}
 */
export function createStream(seed) {
  return { a: seed >>> 0 };
}

/**
 * Create an independent copy of a stream, at its current state. Advancing
 * the clone does not affect the original and vice versa.
 *
 * @param {RngStream} stream
 * @returns {RngStream}
 */
export function cloneStream(stream) {
  return { a: stream.a };
}

/**
 * Advance a stream by one draw and return a float in [0, 1).
 *
 * @param {RngStream} stream Mutated in place.
 * @returns {number}
 */
export function next(stream) {
  let a = (stream.a + 0x6d2b79f5) | 0;
  stream.a = a;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/**
 * Derive a per-car stream from the session seed and that car's index, so
 * each of the six lineages draws from its own independent stream while
 * the whole app stays reproducible from one seed.
 *
 * @param {number} seed Session seed.
 * @param {number} carIndex 0-based car index.
 * @returns {RngStream}
 */
export function carStream(seed, carIndex) {
  // Mix with a large odd multiplier so adjacent car indices do not
  // produce correlated early outputs.
  const mixed = ((seed >>> 0) + carIndex * 0x9e3779b1) >>> 0;
  return createStream(mixed);
}

/**
 * Draw an integer uniformly from [0, count).
 *
 * @param {RngStream} stream
 * @param {number} count Number of choices (exclusive upper bound).
 * @returns {number}
 */
export function randomInt(stream, count) {
  return Math.floor(next(stream) * count) % count;
}

/**
 * Draw a sample from a normal distribution (mean 0), via the Box-Muller
 * transform, for Phase 3's network weight initialisation and mutation
 * (BUILD.md section 13). Routed through the same seeded stream as
 * everything else in src/sim, so a mutated network is just as
 * reproducible from its seed as a learned route.
 *
 * @param {RngStream} stream
 * @param {number} sigma Standard deviation.
 * @returns {number}
 */
export function gaussian(stream, sigma) {
  // next() can return exactly 0; nudge away from it so log() stays finite.
  const u1 = Math.max(next(stream), 1e-12);
  const u2 = next(stream);
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return z * sigma;
}

/**
 * Produce a fresh random 32-bit seed, for the Settings drawer's "new
 * seed" button. Uses Math.random() deliberately: this is a UI convenience
 * to pick a *new* seed, not part of the deterministic simulation itself.
 *
 * @returns {number} Integer seed in [0, 2^31).
 */
export function randomSeed() {
  return Math.floor(Math.random() * 0x7fffffff);
}
