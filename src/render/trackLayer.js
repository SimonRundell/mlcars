/**
 * Draws the track and scenery once to an offscreen canvas (BUILD.md
 * section 8: "the track and scenery are drawn once to a cached layer").
 * The result is a plain <canvas> element that TrackCanvas.jsx blits onto
 * the visible canvas every frame with drawImage, instead of redrawing
 * all this detail 60 times a second.
 */

/** World units per pixel in the cached layer, independent of on-screen zoom. */
export const LAYER_SCALE = 4;

const MARGIN_UNITS = 40;
const GRASS_STRIPE_WIDTH = 24;
const ROAD_OUTLINE_WIDTH = 1.4;
const KERB_LENGTH = 6;
const TUFT_COUNT_PER_100_UNITS = 0.6;

/**
 * @typedef {Object} TrackLayer
 * @property {HTMLCanvasElement} canvas Drawn in layer-pixel space.
 * @property {number} originX World-x that maps to canvas pixel 0.
 * @property {number} originY World-y that maps to canvas pixel 0.
 * @property {number} scale Pixels per world unit (LAYER_SCALE).
 */

/**
 * Convert a world point to this layer's canvas pixel space.
 *
 * @param {TrackLayer} layer
 * @param {{x: number, y: number}} p
 * @returns {{x: number, y: number}}
 */
export function worldToLayer(layer, p) {
  return { x: (p.x - layer.originX) * layer.scale, y: (p.y - layer.originY) * layer.scale };
}

function bounds(points, margin) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX: minX - margin, minY: minY - margin, maxX: maxX + margin, maxY: maxY + margin };
}

function drawGrass(ctx, widthPx, heightPx, palette, seed) {
  const bandPx = GRASS_STRIPE_WIDTH * LAYER_SCALE;
  ctx.fillStyle = palette.colourGrassA;
  ctx.fillRect(0, 0, widthPx, heightPx);
  ctx.fillStyle = palette.colourGrassB;
  let bandIndex = 0;
  for (let y = 0; y < heightPx; y += bandPx) {
    if (bandIndex % 2 === 1) ctx.fillRect(0, y, widthPx, Math.min(bandPx, heightPx - y));
    bandIndex++;
  }

  // A scattering of simple seeded tufts and flowers. Purely decorative,
  // drawn once into the cache, so Math.random here does not touch
  // simulation determinism (src/sim never uses it).
  let rngState = seed >>> 0;
  const rnd = () => {
    rngState = (rngState * 1103515245 + 12345) & 0x7fffffff;
    return rngState / 0x7fffffff;
  };
  const tuftCount = Math.round(((widthPx / LAYER_SCALE) * (heightPx / LAYER_SCALE) / 10000) * TUFT_COUNT_PER_100_UNITS * 100);
  for (let i = 0; i < tuftCount; i++) {
    const x = rnd() * widthPx;
    const y = rnd() * heightPx;
    const isFlower = rnd() > 0.7;
    ctx.fillStyle = isFlower ? '#f3ede0' : palette.colourGrassA;
    ctx.beginPath();
    ctx.arc(x, y, isFlower ? 2.2 : 1.6, 0, Math.PI * 2);
    ctx.fill();
    if (isFlower) {
      ctx.fillStyle = palette.colourAccent;
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function pathFromPoints(ctx, layer, points) {
  points.forEach((p, i) => {
    const q = worldToLayer(layer, p);
    if (i === 0) ctx.moveTo(q.x, q.y);
    else ctx.lineTo(q.x, q.y);
  });
}

function drawRoad(ctx, layer, track, palette) {
  ctx.beginPath();
  pathFromPoints(ctx, layer, track.leftEdge);
  const rightReversed = track.rightEdge.slice().reverse();
  rightReversed.forEach((p) => {
    const q = worldToLayer(layer, p);
    ctx.lineTo(q.x, q.y);
  });
  ctx.closePath();
  ctx.fillStyle = palette.colourTarmac;
  ctx.fill();
  ctx.lineWidth = ROAD_OUTLINE_WIDTH * LAYER_SCALE;
  ctx.strokeStyle = palette.colourInk;
  ctx.beginPath();
  pathFromPoints(ctx, layer, track.leftEdge);
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  pathFromPoints(ctx, layer, track.rightEdge);
  ctx.closePath();
  ctx.stroke();
}

function drawCentreLine(ctx, layer, track, palette) {
  ctx.save();
  ctx.setLineDash([2 * LAYER_SCALE, 2 * LAYER_SCALE]);
  ctx.lineWidth = 0.3 * LAYER_SCALE;
  ctx.strokeStyle = palette.colourLine;
  ctx.beginPath();
  pathFromPoints(ctx, layer, track.samples);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawKerbs(ctx, layer, track, palette) {
  const n = track.samples.length;
  let i = 0;
  let toggle = 0;
  while (i < n) {
    if (!track.samples[i].isKerb) {
      i++;
      continue;
    }
    let j = i;
    while (j < n && track.samples[j].isKerb) j++;
    for (let k = i; k < j; k++) {
      const sample = track.samples[k];
      const outerSign = sample.curvature >= 0 ? -1 : 1; // curving left -> outside is right (negative normal direction)
      const inner = { x: sample.x + sample.normal.x * outerSign * (track.halfWidth - 0.4), y: sample.y + sample.normal.y * outerSign * (track.halfWidth - 0.4) };
      const outer = { x: sample.x + sample.normal.x * outerSign * (track.halfWidth + 0.6), y: sample.y + sample.normal.y * outerSign * (track.halfWidth + 0.6) };
      const a = worldToLayer(layer, inner);
      const b = worldToLayer(layer, outer);
      ctx.strokeStyle = toggle % 2 === 0 ? palette.colourKerbRed : palette.colourKerbWhite;
      ctx.lineWidth = 1.4 * LAYER_SCALE;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      if ((k - i) % Math.max(1, Math.round(KERB_LENGTH / 2)) === 0) toggle++;
    }
    i = j;
  }
}

function drawStartLine(ctx, layer, track, palette) {
  const sample = track.samples[track.startSampleIndex];
  const left = { x: sample.x + sample.normal.x * track.halfWidth, y: sample.y + sample.normal.y * track.halfWidth };
  const right = { x: sample.x - sample.normal.x * track.halfWidth, y: sample.y - sample.normal.y * track.halfWidth };
  const a = worldToLayer(layer, left);
  const b = worldToLayer(layer, right);
  const squares = 10;
  const dx = (b.x - a.x) / squares;
  const dy = (b.y - a.y) / squares;
  const thickness = 1.6 * LAYER_SCALE;
  const nx = -dy / Math.hypot(dx, dy) || 0;
  const ny = dx / Math.hypot(dx, dy) || 0;
  for (let s = 0; s < squares; s++) {
    ctx.fillStyle = s % 2 === 0 ? palette.colourInk : palette.colourKerbWhite;
    const x0 = a.x + dx * s;
    const y0 = a.y + dy * s;
    ctx.beginPath();
    ctx.moveTo(x0 - nx * thickness, y0 - ny * thickness);
    ctx.lineTo(x0 + dx - nx * thickness, y0 + dy - ny * thickness);
    ctx.lineTo(x0 + dx + nx * thickness, y0 + dy + ny * thickness);
    ctx.lineTo(x0 + nx * thickness, y0 + ny * thickness);
    ctx.closePath();
    ctx.fill();
  }
}

/**
 * The track's world-space bounding box, with the same margin used when
 * sizing the cached layer. Shared with TrackCanvas so the on-screen view
 * transform frames the same area.
 *
 * @param {import('../sim/track.js').Track} track
 * @returns {{minX: number, minY: number, maxX: number, maxY: number}}
 */
export function trackWorldBounds(track) {
  return bounds(track.leftEdge.concat(track.rightEdge), MARGIN_UNITS);
}

/**
 * A reasonable spot and size for a circuit logo in the open grass in
 * the middle of the circuit: the centroid of the centreline, sized to
 * the clearest radius found there before the track itself intrudes.
 * A simple, honest estimate rather than a true largest-empty-circle
 * search, so a few less-convex tracks land somewhere cramped - those
 * get a manual `logoAt` override in their TrackDef instead (tracks/oval.js).
 *
 * @param {import('../sim/track.js').Track} track
 * @returns {{x: number, y: number, radius: number}}
 */
function infieldLogoPlacement(track) {
  if (track.logoAt) return track.logoAt;

  let sumX = 0;
  let sumY = 0;
  for (const s of track.samples) {
    sumX += s.x;
    sumY += s.y;
  }
  const cx = sumX / track.samples.length;
  const cy = sumY / track.samples.length;

  let minClearance = Infinity;
  for (const s of track.samples) {
    const clearance = Math.hypot(s.x - cx, s.y - cy) - track.halfWidth;
    if (clearance < minClearance) minClearance = clearance;
  }

  const radius = Math.max(10, Math.min(70, minClearance * 0.85));
  return { x: cx, y: cy, radius };
}

/**
 * Draw a circuit's logo once into the cached layer, centred in the
 * infield and scaled to fit the image's own aspect ratio within the
 * estimated clear space (BUILD.md 12/13).
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {TrackLayer} layer
 * @param {import('../sim/track.js').Track} track
 * @param {HTMLImageElement} logoImage Already loaded (caller checks isImageReady first).
 */
function drawLogo(ctx, layer, track, logoImage) {
  const { x, y, radius } = infieldLogoPlacement(track);
  const centre = worldToLayer(layer, { x, y });
  const aspect = logoImage.naturalWidth / logoImage.naturalHeight || 1;
  let w = radius * 2 * layer.scale;
  let h = w / aspect;
  if (h > radius * 2 * layer.scale) {
    h = radius * 2 * layer.scale;
    w = h * aspect;
  }
  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.drawImage(logoImage, centre.x - w / 2, centre.y - h / 2, w, h);
  ctx.restore();
}

/**
 * Build the cached track layer canvas for a track.
 *
 * @param {import('../sim/track.js').Track} track
 * @param {import('./palette.js').Palette} palette
 * @param {HTMLImageElement} [logoImage] This circuit's logo, if already loaded (see render/imageCache.js) - drawn once into the cache alongside the grass and road.
 * @returns {TrackLayer}
 */
export function buildTrackLayer(track, palette, logoImage) {
  const allPoints = track.leftEdge.concat(track.rightEdge);
  const box = bounds(allPoints, MARGIN_UNITS);
  const widthPx = Math.ceil((box.maxX - box.minX) * LAYER_SCALE);
  const heightPx = Math.ceil((box.maxY - box.minY) * LAYER_SCALE);

  const canvas = document.createElement('canvas');
  canvas.width = widthPx;
  canvas.height = heightPx;
  const ctx = canvas.getContext('2d');

  const layer = { canvas, originX: box.minX, originY: box.minY, scale: LAYER_SCALE };

  const seedForDecor = Math.round(track.length) % 100000;
  drawGrass(ctx, widthPx, heightPx, palette, seedForDecor);
  drawRoad(ctx, layer, track, palette);
  drawKerbs(ctx, layer, track, palette);
  drawCentreLine(ctx, layer, track, palette);
  drawStartLine(ctx, layer, track, palette);
  if (logoImage) drawLogo(ctx, layer, track, logoImage);

  return layer;
}
