/**
 * Reads the design tokens out of :root as a plain object, so canvas
 * drawing code never hardcodes a hex colour (BUILD.md section 8). Call
 * readPalette() once at startup and again whenever the colour scheme
 * changes (a `prefers-color-scheme` media query listener).
 */

const VARS = [
  'colour-bg',
  'colour-surface',
  'colour-text',
  'colour-text-muted',
  'colour-primary',
  'colour-primary-hover',
  'colour-accent',
  'colour-success',
  'colour-warning',
  'colour-danger',
  'colour-border',
  'colour-ink',
  'colour-grass-a',
  'colour-grass-b',
  'colour-tarmac',
  'colour-kerb-red',
  'colour-kerb-white',
  'colour-line',
  'car-1',
  'car-1-ink',
  'car-2',
  'car-2-ink',
  'car-3',
  'car-3-ink',
  'car-4',
  'car-4-ink',
  'car-5',
  'car-5-ink',
  'car-6',
  'car-6-ink',
];

/**
 * @typedef {Object} Palette
 * @property {string} colourBg
 * @property {string} colourSurface
 * @property {string} colourText
 * @property {string} colourTextMuted
 * @property {string} colourPrimary
 * @property {string} colourPrimaryHover
 * @property {string} colourAccent
 * @property {string} colourSuccess
 * @property {string} colourWarning
 * @property {string} colourDanger
 * @property {string} colourBorder
 * @property {string} colourInk
 * @property {string} colourGrassA
 * @property {string} colourGrassB
 * @property {string} colourTarmac
 * @property {string} colourKerbRed
 * @property {string} colourKerbWhite
 * @property {string} colourLine
 * @property {string[]} carColours Six car body colours, index 0-5.
 * @property {string[]} carInks Six matching ink/text colours, index 0-5.
 */

function toCamel(cssVarName) {
  return cssVarName.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
}

/**
 * Read the current token values from :root.
 *
 * @returns {Palette}
 */
export function readPalette() {
  const style = getComputedStyle(document.documentElement);
  const out = {};
  for (const name of VARS) {
    out[toCamel(name)] = style.getPropertyValue(`--${name}`).trim();
  }
  return {
    colourBg: out.colourBg,
    colourSurface: out.colourSurface,
    colourText: out.colourText,
    colourTextMuted: out.colourTextMuted,
    colourPrimary: out.colourPrimary,
    colourPrimaryHover: out.colourPrimaryHover,
    colourAccent: out.colourAccent,
    colourSuccess: out.colourSuccess,
    colourWarning: out.colourWarning,
    colourDanger: out.colourDanger,
    colourBorder: out.colourBorder,
    colourInk: out.colourInk,
    colourGrassA: out.colourGrassA,
    colourGrassB: out.colourGrassB,
    colourTarmac: out.colourTarmac,
    colourKerbRed: out.colourKerbRed,
    colourKerbWhite: out.colourKerbWhite,
    colourLine: out.colourLine,
    carColours: [out.car1, out.car2, out.car3, out.car4, out.car5, out.car6],
    carInks: [out.car1Ink, out.car2Ink, out.car3Ink, out.car4Ink, out.car5Ink, out.car6Ink],
  };
}
