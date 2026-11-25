/**
 * Builds a runtime Track (centreline samples, edges, kerb flags) from a
 * TrackDef data file (see src/tracks). No React, no DOM: this is pure
 * geometry, consumed by both the physics/collision code and the renderer.
 */

import {
  add,
  cross2d,
  curvatureAt,
  leftNormal,
  length as vecLength,
  normalize,
  sampleClosedSpline,
  scale,
  sub,
} from './geometry.js';
import { CENTRELINE_SAMPLE_SPACING } from '../constants.js';

/**
 * @typedef {Object} TrackSample
 * @property {number} x
 * @property {number} y
 * @property {number} cumDist Distance along the centreline from sample 0 to this sample.
 * @property {{x: number, y: number}} tangent Unit vector, direction of travel.
 * @property {{x: number, y: number}} normal Unit "left" normal (positive lateral offset points this way).
 * @property {number} curvature Signed curvature (positive = curving left).
 * @property {boolean} isKerb Whether this point sits in a corner tight enough to paint kerbs.
 */

/**
 * @typedef {Object} Track
 * @property {string} id
 * @property {string} name
 * @property {string} inspiredBy
 * @property {string} lessonNote
 * @property {number} difficulty
 * @property {number} width Full road width, world units.
 * @property {number} halfWidth
 * @property {{x: number, y: number, radius: number}} [logoAt] Manual override for where to centre the circuit logo and how big to draw it, for tracks where the automatic centroid guess lands somewhere cramped (render/trackLayer.js).
 * @property {TrackSample[]} samples Closed-loop centreline samples.
 * @property {number[]} segLength Length of the segment from samples[i] to samples[i+1] (wrapping).
 * @property {number} length Total length of one lap.
 * @property {number} startSampleIndex Index into samples where the start/finish line sits.
 * @property {{x: number, y: number}[]} leftEdge Outer edge polyline (left of travel direction).
 * @property {{x: number, y: number}[]} rightEdge Outer edge polyline (right of travel direction).
 */

/** Fallback samples-per-segment if a track has too few control points to estimate spacing. */
const DEFAULT_SAMPLES_PER_SEGMENT = 24;
const MIN_SAMPLES_PER_SEGMENT = 8;
const MAX_SAMPLES_PER_SEGMENT = 80;

/**
 * Pick a samples-per-segment count that gives roughly CENTRELINE_SAMPLE_SPACING
 * world units between centreline samples, estimated from the straight-line
 * spacing of the control polygon (close enough for this purpose; the spline
 * itself is a little longer than the polygon on curves).
 *
 * @param {{x: number, y: number}[]} points Control points, closed loop.
 * @returns {number}
 */
function estimateSamplesPerSegment(points) {
  const n = points.length;
  if (n < 2) return DEFAULT_SAMPLES_PER_SEGMENT;
  let total = 0;
  for (let i = 0; i < n; i++) {
    total += vecLength(sub(points[(i + 1) % n], points[i]));
  }
  const avgSegmentLength = total / n;
  const estimate = Math.round(avgSegmentLength / CENTRELINE_SAMPLE_SPACING);
  return Math.max(MIN_SAMPLES_PER_SEGMENT, Math.min(MAX_SAMPLES_PER_SEGMENT, estimate));
}

/**
 * A point is treated as being in a kerb-worthy corner once the turning
 * radius drops below this many multiples of the half-width. Purely a
 * rendering cue, computed here because it depends on track geometry.
 */
const KERB_RADIUS_HALFWIDTH_MULTIPLE = 2.5;

/**
 * Build a runtime Track from its data definition.
 *
 * @param {import('../tracks/index.js').TrackDef} trackDef
 * @returns {Track}
 */
export function buildTrack(trackDef) {
  // TrackDef stores control points as plain [x, y] tuples (simpler for a
  // track author to type); the spline/vector helpers want {x, y} objects.
  const controlPoints = trackDef.points.map(([x, y]) => ({ x, y }));
  const samplesPerSegment = estimateSamplesPerSegment(controlPoints);
  const rawPoints = sampleClosedSpline(controlPoints, samplesPerSegment);
  const n = rawPoints.length;
  const halfWidth = trackDef.width / 2;

  const tangents = rawPoints.map((p, i) => {
    const next = rawPoints[(i + 1) % n];
    const prev = rawPoints[(i - 1 + n) % n];
    return normalize(sub(next, prev));
  });

  const segLength = rawPoints.map((p, i) => vecLength(sub(rawPoints[(i + 1) % n], p)));

  const cumDist = new Array(n);
  let acc = 0;
  for (let i = 0; i < n; i++) {
    cumDist[i] = acc;
    acc += segLength[i];
  }
  const totalLength = acc;

  const kerbThreshold = 1 / (halfWidth * KERB_RADIUS_HALFWIDTH_MULTIPLE);

  const samples = rawPoints.map((p, i) => {
    const tangent = tangents[i];
    const normal = leftNormal(tangent);
    const curvature = curvatureAt(rawPoints, i);
    return {
      x: p.x,
      y: p.y,
      cumDist: cumDist[i],
      tangent,
      normal,
      curvature,
      isKerb: Math.abs(curvature) > kerbThreshold,
    };
  });

  const leftEdge = samples.map((s) => add(s, scale(s.normal, halfWidth)));
  const rightEdge = samples.map((s) => add(s, scale(s.normal, -halfWidth)));

  const startSampleIndex = (trackDef.startIndex * samplesPerSegment) % n;

  return {
    id: trackDef.id,
    name: trackDef.name,
    inspiredBy: trackDef.inspiredBy,
    lessonNote: trackDef.lessonNote,
    difficulty: trackDef.difficulty,
    width: trackDef.width,
    halfWidth,
    logoAt: trackDef.logoAt,
    samples,
    segLength,
    length: totalLength,
    startSampleIndex,
    leftEdge,
    rightEdge,
  };
}

/**
 * @typedef {Object} TrackLocation
 * @property {number} index Nearest segment start index.
 * @property {number} t Parameter [0, 1] along that segment.
 * @property {number} offset Signed lateral offset from the centreline (positive = left of travel direction).
 * @property {number} progress Distance along the centreline from sample 0 to this point (not lap-wrapped).
 * @property {number} distance Perpendicular distance from the query point to the segment.
 */

/**
 * Find where a world position sits relative to the track centreline,
 * searching only a window of segments around `lastIndex` so the lookup
 * stays cheap and does not jump across the track at a hairpin or where
 * two parts of the circuit run close together (BUILD.md section 5).
 *
 * @param {Track} track
 * @param {{x: number, y: number}} pos
 * @param {number} windowSize Segments to check either side of lastIndex.
 * @param {number|null} [lastIndex] Previous result's index, or null to search the whole track (use sparingly: only for initial placement).
 * @returns {TrackLocation}
 */
export function locateOnTrack(track, pos, windowSize, lastIndex) {
  const n = track.samples.length;
  const candidates = [];
  if (lastIndex == null) {
    for (let i = 0; i < n; i++) candidates.push(i);
  } else {
    for (let d = -windowSize; d <= windowSize; d++) {
      candidates.push(((lastIndex + d) % n + n) % n);
    }
  }

  let best = null;
  for (const i of candidates) {
    const a = track.samples[i];
    const b = track.samples[(i + 1) % n];
    const ab = sub(b, a);
    const abLen = vecLength(ab);
    const dir = abLen === 0 ? a.tangent : scale(ab, 1 / abLen);
    const toPoint = sub(pos, a);
    const alongRaw = abLen === 0 ? 0 : (toPoint.x * ab.x + toPoint.y * ab.y) / (abLen * abLen);
    const t = Math.max(0, Math.min(1, alongRaw));
    const closest = add(a, scale(ab, t));
    const dist = vecLength(sub(pos, closest));
    if (best === null || dist < best.distance) {
      const offset = cross2d(dir, toPoint);
      const progress = a.cumDist + t * track.segLength[i];
      best = { index: i, t, offset, progress, distance: dist };
    }
  }
  return best;
}

/**
 * World position for a given distance along the centreline (wraps around
 * the lap). Used to place cars on the start grid and to draw learned
 * route trails.
 *
 * @param {Track} track
 * @param {number} distance Distance along the centreline, any real number (wrapped by lap length).
 * @returns {{x: number, y: number, tangent: {x: number, y: number}}}
 */
export function positionAtDistance(track, distance) {
  const n = track.samples.length;
  const wrapped = ((distance % track.length) + track.length) % track.length;
  let i = 0;
  while (i < n - 1 && track.samples[i + 1].cumDist <= wrapped) i++;
  const a = track.samples[i];
  const segLen = track.segLength[i] || 1;
  const t = Math.max(0, Math.min(1, (wrapped - a.cumDist) / segLen));
  const b = track.samples[(i + 1) % n];
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, tangent: a.tangent };
}

