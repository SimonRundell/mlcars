/**
 * Collision tests. Each car is represented as three circles along its
 * length (front, middle, rear) rather than a rectangle, which keeps both
 * the track-edge test and the car-to-car test simple circle checks
 * (BUILD.md section 5).
 */

import { CAR_LENGTH, CAR_WIDTH, NEAREST_SAMPLE_WINDOW } from '../constants.js';
import { locateOnTrack } from './track.js';

/** Circle radius used for every one of the three circles along a car. */
export const CAR_CIRCLE_RADIUS = CAR_WIDTH / 2;

/** Forward offset of the front and rear circle centres from the car's own centre. */
const CIRCLE_OFFSET = CAR_LENGTH / 2 - CAR_CIRCLE_RADIUS;

/**
 * The three circle centres (front, middle, rear) for a car at a given
 * state.
 *
 * @param {import('./physics.js').CarState} state
 * @returns {{x: number, y: number}[]} Three circle centres, front first.
 */
export function carCircleCentres(state) {
  const dx = Math.cos(state.heading) * CIRCLE_OFFSET;
  const dy = Math.sin(state.heading) * CIRCLE_OFFSET;
  return [
    { x: state.x + dx, y: state.y + dy },
    { x: state.x, y: state.y },
    { x: state.x - dx, y: state.y - dy },
  ];
}

/**
 * Test whether a car has run off the track edge, using its three circles
 * against the centreline's lateral offset. Looks up each circle's
 * location using a window around the car's last known centreline index,
 * so the search stays cheap and never jumps across the track.
 *
 * @param {import('./physics.js').CarState} state
 * @param {import('./track.js').Track} track
 * @param {number|null} lastIndex Car's previous centreline sample index, or null for the first lookup.
 * @returns {{hit: boolean, location: import('./track.js').TrackLocation}} `location` is always the car centre's location, for progress tracking.
 */
export function checkTrackEdgeHit(state, track, lastIndex) {
  const centreLocation = locateOnTrack(track, { x: state.x, y: state.y }, NEAREST_SAMPLE_WINDOW, lastIndex);
  const circles = carCircleCentres(state);
  let hit = false;
  for (const circle of circles) {
    const loc = locateOnTrack(track, circle, NEAREST_SAMPLE_WINDOW, centreLocation.index);
    if (Math.abs(loc.offset) + CAR_CIRCLE_RADIUS > track.halfWidth) {
      hit = true;
      break;
    }
  }
  return { hit, location: centreLocation };
}

/**
 * Test whether two cars' circles overlap.
 *
 * @param {import('./physics.js').CarState} stateA
 * @param {import('./physics.js').CarState} stateB
 * @returns {boolean}
 */
export function checkCarCarHit(stateA, stateB) {
  const circlesA = carCircleCentres(stateA);
  const circlesB = carCircleCentres(stateB);
  const minDist = CAR_CIRCLE_RADIUS * 2;
  const minDistSq = minDist * minDist;
  for (const a of circlesA) {
    for (const b of circlesB) {
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      if (dx * dx + dy * dy < minDistSq) return true;
    }
  }
  return false;
}
