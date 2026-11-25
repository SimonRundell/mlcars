/**
 * @typedef {Object} TrackDef
 * @property {string} id Short id, for example 'oval'.
 * @property {string} name Display name.
 * @property {string} inspiredBy Plain text, for the About panel.
 * @property {number} width Full road width in world units.
 * @property {[number, number][]} points Control points of a closed Catmull-Rom spline, in driving order.
 * @property {number} startIndex Index of the control point where the start line sits.
 * @property {number} difficulty 1 (easy) to 5 (hard), used for ordering.
 * @property {string} lessonNote One or two plain sentences on what this track teaches.
 * @property {string} [logo] Path (under /public) to this circuit's logo image, drawn once into the cached track layer, centred in the infield.
 */

// Oval
const OVAL_STRAIGHT = 150;
const OVAL_RADIUS = 130;
const OVAL_DIAG = OVAL_RADIUS * Math.SQRT1_2;

// Monza: two long straights and two wide, equal-radius ends (a "stadium"
// shape, same construction as the oval but stretched) - long straights and
// heavy braking zones into each end, per its lesson note.
const MONZA_STRAIGHT = 250;
const MONZA_RADIUS = 130;
const MONZA_DIAG = MONZA_RADIUS * Math.SQRT1_2;

// Brands Hatch: the same stadium construction, but with a noticeably
// tighter radius at one end than the other, so one end reads as a hairpin
// relative to the other's flowing sweepers.
const BRANDS_HATCH_STRAIGHT = 150;
const BRANDS_HATCH_RADIUS_SWEEP = 150;
const BRANDS_HATCH_RADIUS_HAIRPIN = 90;
const BRANDS_HATCH_DIAG_SWEEP = BRANDS_HATCH_RADIUS_SWEEP * Math.SQRT1_2;
const BRANDS_HATCH_DIAG_HAIRPIN = BRANDS_HATCH_RADIUS_HAIRPIN * Math.SQRT1_2;

// Suzuka: the tightest of the stadium-style tracks - narrower road and a
// smaller hairpin-end radius than Brands Hatch, for the hardest difficulty
// rating. A simple closed loop (no figure-eight crossover, unlike the real
// circuit), so it needs no bridge in the collision model.
const SUZUKA_STRAIGHT = 130;
const SUZUKA_RADIUS_SWEEP = 120;
const SUZUKA_RADIUS_HAIRPIN = 80;
const SUZUKA_DIAG_SWEEP = SUZUKA_RADIUS_SWEEP * Math.SQRT1_2;
const SUZUKA_DIAG_HAIRPIN = SUZUKA_RADIUS_HAIRPIN * Math.SQRT1_2;

/** @type {TrackDef} */
export const oval = {
  id: 'oval',
  name: 'Speedway Oval',
  inspiredBy: 'Indy 500 style speedways',
  width: 28,
  difficulty: 1,
  lessonNote: 'A forgiving track. The cars can learn it with simple steering.',
  startIndex: 0,
  logo: '/Speedway-Oval.png',
  points: [
    [-OVAL_STRAIGHT, OVAL_RADIUS],
    [OVAL_STRAIGHT, OVAL_RADIUS],
    [OVAL_STRAIGHT + OVAL_DIAG, OVAL_DIAG],
    [OVAL_STRAIGHT + OVAL_RADIUS, 0],
    [OVAL_STRAIGHT + OVAL_DIAG, -OVAL_DIAG],
    [OVAL_STRAIGHT, -OVAL_RADIUS],
    [-OVAL_STRAIGHT, -OVAL_RADIUS],
    [-OVAL_STRAIGHT - OVAL_DIAG, -OVAL_DIAG],
    [-OVAL_STRAIGHT - OVAL_RADIUS, 0],
    [-OVAL_STRAIGHT - OVAL_DIAG, OVAL_DIAG],
  ],
};

/** @type {TrackDef} */
export const monza = {
  id: 'monza',
  name: 'Monsa',
  inspiredBy: 'Autodromo Nazionale Monza',
  width: 24,
  difficulty: 2,
  lessonNote:
    'Long straights and heavy braking zones teach speed management.',
  startIndex: 0,
  logo: '/Monsa.png',
  points: [
    [-MONZA_STRAIGHT, MONZA_RADIUS],
    [MONZA_STRAIGHT, MONZA_RADIUS],
    [MONZA_STRAIGHT + MONZA_DIAG, MONZA_DIAG],
    [MONZA_STRAIGHT + MONZA_RADIUS, 0],
    [MONZA_STRAIGHT + MONZA_DIAG, -MONZA_DIAG],
    [MONZA_STRAIGHT, -MONZA_RADIUS],
    [-MONZA_STRAIGHT, -MONZA_RADIUS],
    [-MONZA_STRAIGHT - MONZA_DIAG, -MONZA_DIAG],
    [-MONZA_STRAIGHT - MONZA_RADIUS, 0],
    [-MONZA_STRAIGHT - MONZA_DIAG, MONZA_DIAG],
  ],
};

/** @type {TrackDef} */
export const interlagos = {
  id: 'interlangeos',
  name: 'Interlagos',
  inspiredBy: 'Autodromo Jose Carlos Pace',
  width: 18,
  difficulty: 3,
  lessonNote:
    'Frequent direction changes reward car balance and positioning.',
  startIndex: 0,
  logo: '/Interlangeos.png',
  // The centroid guess lands only ~4 units clear of the track here; this
  // spot, well up and slightly left of it, has over 100 units clear.
  logoAt: { x: -21, y: -136, radius: 60 },
  points: [
    [0, 0],
    // Senna S
    [90, -60],
    [165, 30],
    [240, 0],
    [270, -120],
    [180, -210],
    // Infield
    [45, -255],
    [-90, -225],
    [-165, -90],
    [-120, 45],
    // Final turn
    [-30, 105],
    [15, 45],
  ],
};

/** @type {TrackDef} */
export const barcelona = {
  id: 'barcelona',
  name: 'Barca',
  inspiredBy: 'Circuit de Barcelona-Catalunya',
  width: 14,
  difficulty: 3,
  lessonNote:
    'A balanced layout with a mixture of fast and slow corners.',
  startIndex: 0,
  logo: '/Barca.png',
  logoAt: { x: 257, y: 172, radius: 90 },
  points: [
    [0, 0],
    [414, 0],
    [552, 69],
    [598, 207],
    [483, 322],
    [276, 345],
    [92, 276],
    [-69, 161],
    // Hairpin
    [-138, 0],
    [-69, -138],
    [92, -230],
    [276, -207],
  ],
};

/** @type {TrackDef} */
export const silverstone = {
  id: 'silverstone',
  name: 'Goldstone',
  inspiredBy: 'Silverstone Grand Prix Circuit',
  width: 20,
  difficulty: 4,
  lessonNote:
    'Fast sweeping corners reward smooth steering and good racing lines.',
  startIndex: 0,
  logo: '/Goldstone.png',
  logoAt: { x: 166, y: 109, radius: 55 },
  points: [
    [0, 0],
    [306, 0],
    [391, -34],
    [442, -102],
    [493, -68],
    // Maggotts / Becketts
    [544, 17],
    [510, 102],
    [425, 153],
    [323, 119],
    [221, 187],
    [85, 221],
    [-34, 170],
    // Stowe
    [-119, 68],
    // Club
    [-153, -51],
    [-85, -153],
    [34, -204],
  ],
};

/** @type {TrackDef} */
export const brandsHatch = {
  id: 'brands-hatch',
  name: 'Band New Hatch',
  inspiredBy: 'Brands Hatch F1 Circuit',
  width: 20,
  difficulty: 4,
  lessonNote: 'Flowing sweepers at one end, a tight hairpin at the other.',
  startIndex: 0,
  logo: '/Band-New-Hatch.png',
  points: [
    [-BRANDS_HATCH_STRAIGHT, BRANDS_HATCH_RADIUS_SWEEP],
    [BRANDS_HATCH_STRAIGHT, BRANDS_HATCH_RADIUS_SWEEP],
    [BRANDS_HATCH_STRAIGHT + BRANDS_HATCH_DIAG_SWEEP, BRANDS_HATCH_DIAG_SWEEP],
    [BRANDS_HATCH_STRAIGHT + BRANDS_HATCH_RADIUS_SWEEP, 0],
    [BRANDS_HATCH_STRAIGHT + BRANDS_HATCH_DIAG_HAIRPIN, -BRANDS_HATCH_DIAG_HAIRPIN],
    // Druids Hairpin
    [BRANDS_HATCH_STRAIGHT, -BRANDS_HATCH_RADIUS_HAIRPIN],
    [-BRANDS_HATCH_STRAIGHT, -BRANDS_HATCH_RADIUS_HAIRPIN],
    [-BRANDS_HATCH_STRAIGHT - BRANDS_HATCH_DIAG_HAIRPIN, -BRANDS_HATCH_DIAG_HAIRPIN],
    [-BRANDS_HATCH_STRAIGHT - BRANDS_HATCH_RADIUS_SWEEP, 0],
    [-BRANDS_HATCH_STRAIGHT - BRANDS_HATCH_DIAG_SWEEP, BRANDS_HATCH_DIAG_SWEEP],
  ],
};

/** @type {TrackDef} */
export const spa = {
  id: 'spa',
  name: 'Spa-Bathville',
  inspiredBy: 'Circuit de Spa-Francorchamps',
  width: 22,
  difficulty: 5,
  lessonNote:
    'Very high speed sections mixed with technical corners.',
  startIndex: 0,
  logo: '/Spa-Bathville.png',
  points: [
    [0, 0],
    // Eau Rouge
    [40, -40],
    [90, -100],
    [150, -130],
    // Kemmel
    [280, -120],
    [330, -80],
    [300, -20],
    [230, 40],
    [140, 80],
    [50, 120],
    [-60, 140],
    // Bus Stop
    [-110, 90],
    [-120, 20],
    [-80, -30],
  ],
};

/** @type {TrackDef} */
export const suzuka = {
  id: 'suzuka',
  name: 'Susoska',
  inspiredBy: 'Suzuka Circuit',
  width: 16,
  difficulty: 5,
  lessonNote:
    'The narrowest, tightest track of the set - little room for error.',
  startIndex: 0,
  logo: '/Susoska.png',
  points: [
    [-SUZUKA_STRAIGHT, SUZUKA_RADIUS_SWEEP],
    [SUZUKA_STRAIGHT, SUZUKA_RADIUS_SWEEP],
    [SUZUKA_STRAIGHT + SUZUKA_DIAG_SWEEP, SUZUKA_DIAG_SWEEP],
    [SUZUKA_STRAIGHT + SUZUKA_RADIUS_SWEEP, 0],
    [SUZUKA_STRAIGHT + SUZUKA_DIAG_HAIRPIN, -SUZUKA_DIAG_HAIRPIN],
    // Hairpin
    [SUZUKA_STRAIGHT, -SUZUKA_RADIUS_HAIRPIN],
    [-SUZUKA_STRAIGHT, -SUZUKA_RADIUS_HAIRPIN],
    [-SUZUKA_STRAIGHT - SUZUKA_DIAG_HAIRPIN, -SUZUKA_DIAG_HAIRPIN],
    [-SUZUKA_STRAIGHT - SUZUKA_RADIUS_SWEEP, 0],
    [-SUZUKA_STRAIGHT - SUZUKA_DIAG_SWEEP, SUZUKA_DIAG_SWEEP],
  ],
};
