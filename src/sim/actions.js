/**
 * The nine possible moves (BUILD.md section 4.1). Throttle is one of
 * accelerate/hold/brake; steer is one of left/straight/right. Action index
 * = throttleIndex * 3 + steerIndex, so index 0..8 maps onto a 3x3 grid:
 * rows are throttle (speed up, hold, slow down), columns are steer
 * (left, straight, right).
 */

export const THROTTLE = ['accelerate', 'hold', 'brake'];
export const STEER = ['left', 'straight', 'right'];

export const ACTION_COUNT = THROTTLE.length * STEER.length;

/**
 * @typedef {Object} ActionDef
 * @property {number} index 0 to 8.
 * @property {number} throttleIndex 0 (accelerate), 1 (hold) or 2 (brake).
 * @property {number} steerIndex 0 (left), 1 (straight) or 2 (right).
 * @property {string} throttle One of THROTTLE.
 * @property {string} steer One of STEER.
 * @property {string} label Plain text label, e.g. "Speed up + Left".
 */

const THROTTLE_LABEL = { accelerate: 'Speed up', hold: 'Hold', brake: 'Slow down' };
const STEER_LABEL = { left: 'Left', straight: 'Straight', right: 'Right' };

/** @type {ActionDef[]} All nine actions, index 0 to 8, row-major (throttle, then steer). */
export const ACTIONS = THROTTLE.flatMap((throttle, throttleIndex) =>
  STEER.map((steer, steerIndex) => {
    const index = throttleIndex * STEER.length + steerIndex;
    return {
      index,
      throttleIndex,
      steerIndex,
      throttle,
      steer,
      label: `${THROTTLE_LABEL[throttle]} + ${STEER_LABEL[steer]}`,
    };
  })
);

/**
 * Look up an action by its 0-8 index.
 *
 * @param {number} index 0 to 8.
 * @returns {ActionDef} The matching action.
 */
export function getAction(index) {
  return ACTIONS[index];
}

/**
 * Convert a throttle direction (-1 brake, 0 hold, 1 accelerate) to its
 * signed acceleration multiplier, used by physics.js.
 *
 * @param {string} throttle One of THROTTLE.
 * @returns {-1|0|1} Signed throttle direction.
 */
export function throttleSign(throttle) {
  if (throttle === 'accelerate') return 1;
  if (throttle === 'brake') return -1;
  return 0;
}

/**
 * Convert a steer direction to its signed value, used by physics.js.
 *
 * @param {string} steer One of STEER.
 * @returns {-1|0|1} Signed steer direction.
 */
export function steerSign(steer) {
  if (steer === 'left') return -1;
  if (steer === 'right') return 1;
  return 0;
}
