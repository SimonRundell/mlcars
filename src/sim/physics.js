/**
 * Car motion for a single physics tick. Pure functions only: given a car's
 * state and a chosen action, return the next state. No DOM, no React, no
 * wall-clock time - the caller always passes a fixed dt (BUILD.md 4.7).
 */

import { steerSign, throttleSign } from './actions.js';
import {
  ACCEL,
  A_LAT_MAX,
  BRAKE,
  DRAG,
  MAX_SPEED,
  MIN_SPEED,
  OMEGA_MAX,
  SPEED_FLOOR,
} from '../constants.js';

/**
 * @typedef {Object} CarState
 * @property {number} x
 * @property {number} y
 * @property {number} heading Radians, 0 = pointing along +x.
 * @property {number} speed World units per second, always within [MIN_SPEED, MAX_SPEED] while running.
 */

/**
 * Advance a car's physics state by one fixed tick.
 *
 * @param {CarState} state Current state. Not mutated.
 * @param {import('./actions.js').ActionDef} action Chosen action for this decision step.
 * @param {number} dt Fixed tick length in seconds (1 / TICKS_PER_SECOND).
 * @returns {CarState} The next state.
 */
export function stepPhysicsTick(state, action, dt) {
  const throttleAccel = throttleSign(action.throttle) >= 0
    ? ACCEL * throttleSign(action.throttle)
    : -BRAKE;
  const drag = DRAG * state.speed;
  let speed = state.speed + (throttleAccel - drag) * dt;
  speed = Math.max(MIN_SPEED, Math.min(MAX_SPEED, speed));

  const steer = steerSign(action.steer);
  const omega = steer * Math.min(OMEGA_MAX, A_LAT_MAX / Math.max(state.speed, SPEED_FLOOR));

  const x = state.x + Math.cos(state.heading) * state.speed * dt;
  const y = state.y + Math.sin(state.heading) * state.speed * dt;
  const heading = state.heading + omega * dt;

  return { x, y, heading, speed };
}

/**
 * Linearly interpolate between two car states, for smooth sub-tick drawing
 * at 1x speed. Headings are interpolated the short way round the circle.
 *
 * @param {CarState} from
 * @param {CarState} to
 * @param {number} t Interpolation factor in [0, 1].
 * @returns {CarState}
 */
export function interpolateCarState(from, to, t) {
  let deltaHeading = to.heading - from.heading;
  deltaHeading -= Math.round(deltaHeading / (2 * Math.PI)) * 2 * Math.PI;
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
    heading: from.heading + deltaHeading * t,
    speed: from.speed + (to.speed - from.speed) * t,
  };
}
