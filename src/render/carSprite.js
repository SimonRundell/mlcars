/**
 * Draws one cartoon car. The caller is expected to have already
 * translated and rotated the canvas context to the car's position and
 * heading, in pixel space; this module only draws the car's own shape,
 * centred on the current origin and pointing along +x (BUILD.md 3.4).
 */

import { CAR_LENGTH, CAR_WIDTH } from '../constants.js';

/**
 * @typedef {'exploring'|'locked'|'newBest'|'dizzy'} EyeState
 */

/**
 * Paint the car's identity pattern (stripe, spots, chevron, checks,
 * hoops - or nothing for plain) inside the body outline, which must
 * already be the current clip path.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} pattern
 * @param {string} inkColour
 * @param {number} lengthPx
 * @param {number} widthPx
 */
function paintPattern(ctx, pattern, inkColour, lengthPx, widthPx) {
  ctx.fillStyle = inkColour;
  ctx.globalAlpha = 0.85;
  switch (pattern) {
    case 'stripe': {
      const w = widthPx * 0.26;
      ctx.fillRect(-lengthPx / 2, -w / 2, lengthPx, w);
      break;
    }
    case 'spots': {
      const r = widthPx * 0.14;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.arc((i * lengthPx) / 3.2, 0, r, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'chevron': {
      ctx.beginPath();
      ctx.moveTo(-lengthPx * 0.1, -widthPx / 2);
      ctx.lineTo(lengthPx * 0.18, 0);
      ctx.lineTo(-lengthPx * 0.1, widthPx / 2);
      ctx.lineTo(-lengthPx * 0.22, 0);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'checks': {
      const cell = widthPx * 0.3;
      for (let x = -lengthPx / 2; x < lengthPx / 2; x += cell) {
        for (let y = -widthPx / 2; y < widthPx / 2; y += cell) {
          const col = Math.round(x / cell);
          const row = Math.round(y / cell);
          if ((col + row) % 2 === 0) ctx.fillRect(x, y, cell, cell);
        }
      }
      break;
    }
    case 'hoops': {
      const hoopW = lengthPx * 0.12;
      for (let x = -lengthPx / 2 + hoopW; x < lengthPx / 2; x += hoopW * 2.2) {
        ctx.fillRect(x, -widthPx / 2, hoopW, widthPx);
      }
      break;
    }
    default:
      break;
  }
  ctx.globalAlpha = 1;
}

/**
 * Draw the googly eyes and expression on the windscreen.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {EyeState} eyeState
 * @param {number} steerDirection -1, 0 or 1 - which way the pupils look.
 * @param {number} lengthPx
 * @param {number} widthPx
 * @param {boolean} reducedMotion
 */
function drawEyes(ctx, eyeState, steerDirection, lengthPx, widthPx, reducedMotion) {
  const eyeX = lengthPx * 0.16;
  const eyeGap = widthPx * 0.26;
  const eyeR = widthPx * 0.17;
  const pupilR = eyeR * 0.45;
  const pupilShift = reducedMotion ? 0 : steerDirection * eyeR * 0.35;

  for (const side of [-1, 1]) {
    const cx = eyeX;
    const cy = side * eyeGap;
    ctx.beginPath();
    ctx.ellipse(cx, cy, eyeR, eyeR * (eyeState === 'exploring' ? 1.15 : 1), 0, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = eyeR * 0.18;
    ctx.strokeStyle = '#1a1510';
    ctx.stroke();

    if (eyeState === 'dizzy') {
      ctx.strokeStyle = '#1a1510';
      ctx.lineWidth = pupilR * 0.35;
      ctx.beginPath();
      for (let a = 0; a < Math.PI * 3; a += 0.3) {
        const r = (pupilR * a) / (Math.PI * 3);
        const px = cx + Math.cos(a) * r;
        const py = cy + Math.sin(a) * r;
        if (a === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    } else if (eyeState === 'newBest') {
      ctx.strokeStyle = '#1a1510';
      ctx.lineWidth = pupilR * 0.6;
      ctx.beginPath();
      ctx.arc(cx, cy, pupilR * 1.1, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#1a1510';
      ctx.beginPath();
      ctx.arc(cx + pupilShift, cy, pupilR, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/**
 * Draw one car, centred on the canvas origin, pointing along +x.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} options
 * @param {number} options.scale Pixels per world unit.
 * @param {number} options.number Car number, shown on the roof.
 * @param {string} options.bodyColour
 * @param {string} options.inkColour Contrasting colour for the number/pattern on this body colour.
 * @param {string} options.outlineColour Thick ink outline colour.
 * @param {string} options.pattern 'plain'|'stripe'|'spots'|'chevron'|'checks'|'hoops'.
 * @param {EyeState} options.eyeState
 * @param {number} options.steerDirection -1, 0 or 1.
 * @param {boolean} [options.faded] True for a finished, non-colliding car.
 * @param {boolean} [options.reducedMotion]
 */
export function drawCar(ctx, options) {
  const { scale, number, bodyColour, inkColour, outlineColour, pattern, eyeState, steerDirection, faded, reducedMotion } = options;
  const lengthPx = CAR_LENGTH * scale;
  const widthPx = CAR_WIDTH * scale;
  const radius = widthPx * 0.45;

  ctx.save();
  if (faded) ctx.globalAlpha = 0.45;

  ctx.beginPath();
  ctx.moveTo(-lengthPx / 2 + radius, -widthPx / 2);
  ctx.arcTo(lengthPx / 2, -widthPx / 2, lengthPx / 2, widthPx / 2, radius);
  ctx.arcTo(lengthPx / 2, widthPx / 2, -lengthPx / 2, widthPx / 2, radius);
  ctx.arcTo(-lengthPx / 2, widthPx / 2, -lengthPx / 2, -widthPx / 2, radius);
  ctx.arcTo(-lengthPx / 2, -widthPx / 2, lengthPx / 2, -widthPx / 2, radius);
  ctx.closePath();

  ctx.fillStyle = bodyColour;
  ctx.fill();

  ctx.save();
  ctx.clip();
  paintPattern(ctx, pattern, inkColour, lengthPx, widthPx);
  ctx.restore();

  ctx.lineWidth = Math.max(1.5, widthPx * 0.07);
  ctx.strokeStyle = outlineColour;
  ctx.stroke();

  ctx.fillStyle = inkColour;
  ctx.font = `bold ${Math.round(widthPx * 0.55)}px "Trebuchet MS", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(number), -lengthPx * 0.08, 0);

  drawEyes(ctx, eyeState, steerDirection, lengthPx, widthPx, Boolean(reducedMotion));

  ctx.restore();
}
