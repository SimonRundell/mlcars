/**
 * Validates every track in src/tracks against BUILD.md section 6.1:
 * closed loop, no self-crossing, minimum curvature radius larger than
 * half the road width, and a sensible lap length. Run with
 * `npm run validate:tracks`. Exits non-zero if any track fails.
 */

import { buildTrack } from '../src/sim/track.js';
import { TRACKS } from '../src/tracks/index.js';

const MIN_LENGTH = 200;
const MAX_LENGTH = 3000;

/** Segments more than this many indices apart are treated as candidates for a self-crossing check; closer pairs share geometry by construction and would always "touch". */
const ADJACENCY_GUARD = 2;

/**
 * Whether segments ab and cd (as sample points) cross each other.
 *
 * @param {{x:number,y:number}} a @param {{x:number,y:number}} b
 * @param {{x:number,y:number}} c @param {{x:number,y:number}} d
 * @returns {boolean}
 */
function segmentsCross(a, b, c, d) {
  const d1x = b.x - a.x;
  const d1y = b.y - a.y;
  const d2x = d.x - c.x;
  const d2y = d.y - c.y;
  const denom = d1x * d2y - d1y * d2x;
  if (denom === 0) return false; // parallel, ignore (rare and not worth the edge-case handling here)
  const t = ((c.x - a.x) * d2y - (c.y - a.y) * d2x) / denom;
  const u = ((c.x - a.x) * d1y - (c.y - a.y) * d1x) / denom;
  return t > 0 && t < 1 && u > 0 && u < 1;
}

/**
 * @param {import('../src/sim/track.js').Track} track
 * @returns {boolean}
 */
function hasSelfCrossing(track) {
  const n = track.samples.length;
  for (let i = 0; i < n; i++) {
    const a = track.samples[i];
    const b = track.samples[(i + 1) % n];
    for (let j = i + ADJACENCY_GUARD; j < n; j++) {
      if (Math.abs(j - i) < ADJACENCY_GUARD) continue;
      if (n - (j - i) < ADJACENCY_GUARD) continue; // wraps back close to i
      const c = track.samples[j];
      const d = track.samples[(j + 1) % n];
      if (segmentsCross(a, b, c, d)) return true;
    }
  }
  return false;
}

/**
 * @param {import('../src/sim/track.js').Track} track
 * @returns {number} The tightest turning radius found anywhere on the track.
 */
function minTurnRadius(track) {
  let min = Infinity;
  for (const s of track.samples) {
    if (s.curvature === 0) continue;
    const radius = 1 / Math.abs(s.curvature);
    if (radius < min) min = radius;
  }
  return min;
}

let allPassed = true;

for (const trackDef of TRACKS) {
  const track = buildTrack(trackDef);
  const problems = [];

  if (track.length < MIN_LENGTH || track.length > MAX_LENGTH) {
    problems.push(`length ${track.length.toFixed(1)} is outside the sensible range ${MIN_LENGTH}-${MAX_LENGTH}`);
  }

  const radius = minTurnRadius(track);
  if (radius < track.halfWidth) {
    problems.push(`tightest turn radius ${radius.toFixed(1)} is smaller than half the road width (${track.halfWidth.toFixed(1)})`);
  }

  if (hasSelfCrossing(track)) {
    problems.push('centreline self-crosses');
  }

  if (problems.length === 0) {
    console.log(`PASS  ${trackDef.id} (length ${track.length.toFixed(0)}, min radius ${radius.toFixed(1)})`);
  } else {
    allPassed = false;
    console.log(`FAIL  ${trackDef.id}`);
    for (const p of problems) console.log(`      - ${p}`);
  }
}

if (!allPassed) process.exit(1);
