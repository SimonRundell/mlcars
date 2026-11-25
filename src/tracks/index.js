import {
  barcelona,
  brandsHatch,
  interlagos,
  monza,
  oval,
  silverstone,
  spa,
  suzuka,
} from './oval.js';

/** @typedef {import('./oval.js').TrackDef} TrackDef */

/** All available tracks, ordered by difficulty. @type {TrackDef[]} */
export const TRACKS = [oval, monza, interlagos, barcelona, silverstone, brandsHatch, spa, suzuka];

/**
 * Look up a track definition by id.
 *
 * @param {string} id
 * @returns {TrackDef|undefined}
 */
export function getTrackById(id) {
  return TRACKS.find((t) => t.id === id);
}

export const DEFAULT_TRACK_ID = oval.id;
