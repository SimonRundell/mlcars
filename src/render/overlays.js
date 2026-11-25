/**
 * Learned-line trails and crash marks. The learned line is recomputed by
 * replaying a lineage's best action sequence from the fixed start grid
 * position through plain physics - it ignores other cars, so it always
 * shows the car's own best plan, not what traffic did to it that round.
 * Cheap enough to redo once whenever a lineage's `best` route changes,
 * not every frame.
 */

import { getAction } from '../sim/actions.js';
import { SENSOR_MAX_RANGE, SENSOR_RAY_ANGLES_DEG, TICKS_PER_SECOND, TICKS_PER_STEP } from '../constants.js';
import { stepPhysicsTick } from '../sim/physics.js';

const TICK_SECONDS = 1 / TICKS_PER_SECOND;
const RAY_ANGLES_RAD = SENSOR_RAY_ANGLES_DEG.map((deg) => (deg * Math.PI) / 180);

/**
 * Replay a route from a fixed start state, sampling position once per
 * decision step (not every tick - plenty for a visual trail).
 *
 * @param {import('../sim/physics.js').CarState} startState
 * @param {number[]} route Action indices.
 * @returns {{x: number, y: number}[]}
 */
export function computeLearnedLinePoints(startState, route) {
  let state = startState;
  const points = [{ x: state.x, y: state.y }];
  for (const actionIndex of route) {
    const action = getAction(actionIndex);
    for (let t = 0; t < TICKS_PER_STEP; t++) {
      state = stepPhysicsTick(state, action, TICK_SECONDS);
    }
    points.push({ x: state.x, y: state.y });
  }
  return points;
}

/**
 * Draw a learned-line trail as a faint dashed polyline in the car's own
 * colour. Expects world-space points; the caller's context should
 * already be transformed to screen space (translate + scale, no
 * rotation needed since these are absolute world coordinates).
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {{x: number, y: number}[]} points World-space points (already screen-transformed by the caller's own toScreen before calling, OR pass world points and let caller transform - see TrackCanvas for the convention used).
 * @param {string} colour
 * @param {number} lineWidthPx
 */
export function drawLearnedLine(ctx, points, colour, lineWidthPx) {
  if (points.length < 2) return;
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.setLineDash([lineWidthPx * 2.2, lineWidthPx * 1.6]);
  ctx.lineWidth = lineWidthPx;
  ctx.strokeStyle = colour;
  ctx.lineCap = 'round';
  ctx.beginPath();
  points.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();
  ctx.restore();
}

/**
 * Draw the selected sensor car's seven rays (BUILD.md 13), from its
 * centre out to where each one reports the track edge (or other cars).
 * World-space in, caller's context already transformed to screen.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {{x: number, y: number}} carPos Screen-space car position (already run through the caller's toScreen).
 * @param {number} heading Car heading, radians (screen and world headings match - no rotation in the view transform).
 * @param {number[]} rayDistances Normalized [0, 1] readings, one per SENSOR_RAY_ANGLES_DEG entry (sensors.js).
 * @param {number} viewScale World-to-screen scale, so ray lengths (world units) are drawn at the right pixel length.
 * @param {string} colour
 * @param {number} lineWidthPx
 */
export function drawSensorRays(ctx, carPos, heading, rayDistances, viewScale, colour, lineWidthPx) {
  ctx.save();
  ctx.globalAlpha = 0.8;
  ctx.lineWidth = lineWidthPx;
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineCap = 'round';
  RAY_ANGLES_RAD.forEach((offset, i) => {
    const distance = rayDistances[i] * SENSOR_MAX_RANGE * viewScale;
    const angle = heading + offset;
    ctx.beginPath();
    ctx.moveTo(carPos.x, carPos.y);
    ctx.lineTo(carPos.x + Math.cos(angle) * distance, carPos.y + Math.sin(angle) * distance);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(carPos.x + Math.cos(angle) * distance, carPos.y + Math.sin(angle) * distance, lineWidthPx * 1.3, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

/**
 * Draw a small "X" crash mark at a world/screen position (whichever
 * space the caller's context is transformed to).
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} size Half-width of the X, in the same units as x/y.
 * @param {string} colour
 */
export function drawCrashMark(ctx, x, y, size, colour) {
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = size * 0.35;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - size, y - size);
  ctx.lineTo(x + size, y + size);
  ctx.moveTo(x + size, y - size);
  ctx.lineTo(x - size, y + size);
  ctx.stroke();
  ctx.restore();
}
