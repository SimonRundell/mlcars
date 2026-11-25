/**
 * Phase 3 sensors (BUILD.md section 13): seven forward rays reporting
 * distance to the track edge, plus current speed and the distance to
 * the nearest car ahead, all normalized to [0, 1] so the network never
 * has to learn the scale of the world it is in. No React, no DOM, and
 * no Math.random (there is no randomness here at all - this is pure
 * geometry read off the live car/track state).
 */

import { locateOnTrack } from './track.js';
import { SENSOR_MAX_RANGE, SENSOR_RAY_STEP, SENSOR_SEARCH_WINDOW, SENSOR_RAY_ANGLES_DEG, MAX_SPEED } from '../constants.js';

const RAY_ANGLES_RAD = SENSOR_RAY_ANGLES_DEG.map((deg) => (deg * Math.PI) / 180);

/**
 * March outward from `origin` along one ray until it leaves the track
 * (|offset| exceeds the half width) or runs out of range.
 *
 * @param {import('./track.js').Track} track
 * @param {{x: number, y: number}} origin
 * @param {number} angleRad Absolute heading of the ray (car heading + offset).
 * @param {number} lastIndex Car's last known centreline index, as a starting point for the windowed lookup.
 * @returns {number} Distance to the edge, in world units, capped at SENSOR_MAX_RANGE.
 */
function castRay(track, origin, angleRad, lastIndex) {
  const dx = Math.cos(angleRad);
  const dy = Math.sin(angleRad);
  let index = lastIndex;
  for (let distance = SENSOR_RAY_STEP; distance <= SENSOR_MAX_RANGE; distance += SENSOR_RAY_STEP) {
    const point = { x: origin.x + dx * distance, y: origin.y + dy * distance };
    const location = locateOnTrack(track, point, SENSOR_SEARCH_WINDOW, index);
    index = location.index;
    if (Math.abs(location.offset) > track.halfWidth) return distance;
  }
  return SENSOR_MAX_RANGE;
}

/**
 * @typedef {Object} SensorReading
 * @property {number[]} rayDistances One normalized [0, 1] reading per SENSOR_RAY_ANGLES_DEG entry, 1 = clear to SENSOR_MAX_RANGE.
 * @property {number} speed Current speed normalized by MAX_SPEED.
 * @property {number} nearestCar Normalized distance to the nearest other car within the forward sensor fan, 1 = clear or none nearby.
 * @property {number[]} inputs All of the above flattened into one array, in network input order: rays..., speed, nearestCar.
 */

/**
 * Read all of one car's sensors at its current state.
 *
 * @param {import('./physics.js').CarState} state
 * @param {import('./track.js').Track} track
 * @param {number} lastTrackIndex This car's last known centreline index.
 * @param {import('./physics.js').CarState[]} otherCarStates Every other active car's current state.
 * @returns {SensorReading}
 */
export function readSensors(state, track, lastTrackIndex, otherCarStates) {
  const origin = { x: state.x, y: state.y };
  const rayDistances = RAY_ANGLES_RAD.map((offset) => castRay(track, origin, state.heading + offset, lastTrackIndex) / SENSOR_MAX_RANGE);

  const speed = Math.max(0, Math.min(1, state.speed / MAX_SPEED));

  const halfFan = Math.PI / 2; // matches the +-90 degree spread of the ray fan
  let nearestDistance = SENSOR_MAX_RANGE;
  for (const other of otherCarStates) {
    const dx = other.x - state.x;
    const dy = other.y - state.y;
    const distance = Math.hypot(dx, dy);
    if (distance > SENSOR_MAX_RANGE) continue;
    const bearing = Math.atan2(dy, dx) - state.heading;
    const wrapped = Math.atan2(Math.sin(bearing), Math.cos(bearing));
    if (Math.abs(wrapped) > halfFan) continue;
    if (distance < nearestDistance) nearestDistance = distance;
  }
  const nearestCar = nearestDistance / SENSOR_MAX_RANGE;

  return {
    rayDistances,
    speed,
    nearestCar,
    inputs: [...rayDistances, speed, nearestCar],
  };
}
