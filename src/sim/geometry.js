/**
 * Generic 2D vector and spline math, with no knowledge of tracks, cars or
 * the DOM. Used by track.js to build the centreline/edges, and by
 * physics.js and collisions.js for car motion and overlap tests.
 */

/**
 * @typedef {{x: number, y: number}} Vec2
 */

/** @param {Vec2} a @param {Vec2} b @returns {Vec2} */
export function add(a, b) {
  return { x: a.x + b.x, y: a.y + b.y };
}

/** @param {Vec2} a @param {Vec2} b @returns {Vec2} */
export function sub(a, b) {
  return { x: a.x - b.x, y: a.y - b.y };
}

/** @param {Vec2} a @param {number} s @returns {Vec2} */
export function scale(a, s) {
  return { x: a.x * s, y: a.y * s };
}

/** @param {Vec2} a @returns {number} */
export function length(a) {
  return Math.hypot(a.x, a.y);
}

/** @param {Vec2} a @returns {Vec2} Unit vector, or {0,0} if a is the zero vector. */
export function normalize(a) {
  const len = length(a);
  if (len === 0) return { x: 0, y: 0 };
  return { x: a.x / len, y: a.y / len };
}

/** @param {Vec2} a @param {Vec2} b @returns {number} */
export function dot(a, b) {
  return a.x * b.x + a.y * b.y;
}

/** 2D "cross product" (z component of the 3D cross product). @param {Vec2} a @param {Vec2} b @returns {number} */
export function cross2d(a, b) {
  return a.x * b.y - a.y * b.x;
}

/** @param {Vec2} a @param {Vec2} b @param {number} t @returns {Vec2} */
export function lerp(a, b, t) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** Rotate a vector by `radians` (counter-clockwise, standard maths convention). @param {Vec2} a @param {number} radians @returns {Vec2} */
export function rotate(a, radians) {
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  return { x: a.x * c - a.y * s, y: a.x * s + a.y * c };
}

/** The left-hand normal of a direction vector (rotate +90 degrees), as a unit vector. @param {Vec2} dir @returns {Vec2} */
export function leftNormal(dir) {
  const u = normalize(dir);
  return { x: -u.y, y: u.x };
}

/**
 * Evaluate a uniform Catmull-Rom spline segment at parameter t in [0, 1],
 * given the point before, the two endpoints, and the point after.
 *
 * @param {Vec2} p0 @param {Vec2} p1 @param {Vec2} p2 @param {Vec2} p3 @param {number} t
 * @returns {Vec2}
 */
export function catmullRomPoint(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  const x =
    0.5 *
    (2 * p1.x +
      (-p0.x + p2.x) * t +
      (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
      (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
  const y =
    0.5 *
    (2 * p1.y +
      (-p0.y + p2.y) * t +
      (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
      (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);
  return { x, y };
}

/**
 * Sample a closed Catmull-Rom spline through `points` (in driving order)
 * at a fixed number of samples per control-point segment. The loop wraps,
 * so the last segment runs from the final point back to the first.
 *
 * @param {Vec2[]} points Control points, closed loop, driving order.
 * @param {number} samplesPerSegment Samples to generate per segment (excludes the segment's end point, which is the next segment's start).
 * @returns {Vec2[]} Densely sampled points around the closed loop.
 */
export function sampleClosedSpline(points, samplesPerSegment) {
  const n = points.length;
  const out = [];
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];
    for (let s = 0; s < samplesPerSegment; s++) {
      const t = s / samplesPerSegment;
      out.push(catmullRomPoint(p0, p1, p2, p3, t));
    }
  }
  return out;
}

/**
 * Signed curvature of the path at sample index i, estimated from the
 * samples either side. Positive curves left, negative curves right
 * (consistent with leftNormal's handedness).
 *
 * @param {Vec2[]} samples Closed-loop samples.
 * @param {number} i Index into samples.
 * @returns {number} Approximate curvature (1 / radius), signed.
 */
export function curvatureAt(samples, i) {
  const n = samples.length;
  const prev = samples[(i - 1 + n) % n];
  const curr = samples[i];
  const next = samples[(i + 1) % n];
  const d1 = sub(curr, prev);
  const d2 = sub(next, curr);
  const len1 = length(d1);
  const len2 = length(d2);
  if (len1 === 0 || len2 === 0) return 0;
  const turn = Math.atan2(cross2d(d1, d2), dot(d1, d2));
  const avgStep = (len1 + len2) / 2;
  return avgStep === 0 ? 0 : turn / avgStep;
}

/**
 * Closest point on a line segment to a given point, as a parameter in
 * [0, 1] along the segment.
 *
 * @param {Vec2} p Point to test.
 * @param {Vec2} a Segment start.
 * @param {Vec2} b Segment end.
 * @returns {number} Clamped t in [0, 1].
 */
export function closestSegmentT(p, a, b) {
  const ab = sub(b, a);
  const abLenSq = dot(ab, ab);
  if (abLenSq === 0) return 0;
  const t = dot(sub(p, a), ab) / abLenSq;
  return Math.max(0, Math.min(1, t));
}
