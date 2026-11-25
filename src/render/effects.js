/**
 * Short, small crash effects: a poof cloud and a couple of orbiting
 * stars. Nothing here flashes faster than three times a second and there
 * are no full-screen flashes (BUILD.md 3.4). The caller tracks each
 * effect's own age and stops drawing it once past DURATION_SECONDS.
 */

export const DURATION_SECONDS = 0.9;

/**
 * Draw a short "poof" cloud centred on the canvas origin. Caller must
 * have already translated (not rotated) to the crash position.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} scale Pixels per world unit.
 * @param {number} age Seconds since the crash, 0 to DURATION_SECONDS.
 * @param {string} inkColour
 * @param {string} cloudColour
 */
export function drawPoof(ctx, scale, age, inkColour, cloudColour) {
  const t = Math.min(1, age / DURATION_SECONDS);
  const grow = 1 + t * 1.6;
  const fade = 1 - t;
  ctx.save();
  ctx.globalAlpha = fade;
  const puffR = 1.1 * scale * grow;
  const offsets = [
    [0, 0],
    [0.8, 0.3],
    [-0.8, 0.3],
    [0.3, -0.7],
    [-0.3, -0.7],
  ];
  for (const [ox, oy] of offsets) {
    ctx.beginPath();
    ctx.arc(ox * scale * grow, oy * scale * grow, puffR * 0.6, 0, Math.PI * 2);
    ctx.fillStyle = cloudColour;
    ctx.fill();
    ctx.lineWidth = Math.max(1, 0.15 * scale);
    ctx.strokeStyle = inkColour;
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Draw two or three small stars orbiting the crash position. If
 * `reducedMotion` is set, draws them static (no orbit animation) rather
 * than skipping the content entirely, per BUILD.md section 10.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} scale Pixels per world unit.
 * @param {number} age Seconds since the crash.
 * @param {string} starColour
 * @param {boolean} reducedMotion
 */
export function drawOrbitingStars(ctx, scale, age, starColour, reducedMotion) {
  const fade = Math.max(0, 1 - age / DURATION_SECONDS);
  if (fade <= 0) return;
  const starCount = 3;
  const orbitR = 2.4 * scale;
  ctx.save();
  ctx.globalAlpha = fade;
  ctx.fillStyle = starColour;
  for (let i = 0; i < starCount; i++) {
    const baseAngle = (i * (Math.PI * 2)) / starCount;
    const angle = reducedMotion ? baseAngle : baseAngle + age * 6;
    const x = Math.cos(angle) * orbitR;
    const y = Math.sin(angle) * orbitR - 1.5 * scale;
    drawStar(ctx, x, y, scale * 0.35);
  }
  ctx.restore();
}

function drawStar(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const outerAngle = (Math.PI / 2) + (i * 2 * Math.PI) / 5;
    const innerAngle = outerAngle + Math.PI / 5;
    const ox = cx + Math.cos(outerAngle) * r;
    const oy = cy - Math.sin(outerAngle) * r;
    const ix = cx + Math.cos(innerAngle) * r * 0.45;
    const iy = cy - Math.sin(innerAngle) * r * 0.45;
    if (i === 0) ctx.moveTo(ox, oy);
    else ctx.lineTo(ox, oy);
    ctx.lineTo(ix, iy);
  }
  ctx.closePath();
  ctx.fill();
}
