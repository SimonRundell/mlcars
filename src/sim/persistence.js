/**
 * localStorage save/load, plus JSON export/import (BUILD.md section 9).
 * Settings are global; everything else is stored per track id. Wrapped
 * in try/catch throughout, since storage can be missing (private
 * browsing) or full.
 */

import { SAVE_KEY, SAVE_VERSION } from '../constants.js';

/**
 * @typedef {Object} SaveFile
 * @property {number} version
 * @property {import('./world.js').WorldSettings} settings
 * @property {Object<string, {route?: Object, sensor?: Object}>} tracks Track id -> that track's progress, keyed again by learning mode (BUILD.md 13), each value a World.serialize() output for that mode.
 */

/**
 * Read the save file from localStorage.
 *
 * @returns {SaveFile|null} null if there is nothing saved, storage is unavailable, or the data could not be parsed.
 */
export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || typeof parsed.version !== 'number') return null;
    if (parsed.version !== SAVE_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Write the save file to localStorage. Silently does nothing if storage
 * is unavailable or full: this is a convenience, not a guarantee.
 *
 * @param {SaveFile} saveFile
 * @returns {boolean} Whether the write succeeded.
 */
export function writeSave(saveFile) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(saveFile));
    return true;
  } catch {
    return false;
  }
}

/**
 * Build a save file from the current global settings and a map of track
 * id to that track's World.serialize() output.
 *
 * @param {import('./world.js').WorldSettings} settings
 * @param {Object<string, Object>} tracks
 * @returns {SaveFile}
 */
export function buildSaveFile(settings, tracks) {
  return { version: SAVE_VERSION, settings, tracks };
}

/**
 * Serialize a save file for download as a `.json` export.
 *
 * @param {SaveFile} saveFile
 * @returns {string}
 */
export function exportSaveFile(saveFile) {
  return JSON.stringify(saveFile, null, 2);
}

/**
 * Parse and validate an imported save file's text. Refuses anything
 * without a matching major version, per BUILD.md section 9.
 *
 * @param {string} text
 * @returns {{ ok: true, saveFile: SaveFile } | { ok: false, error: string }}
 */
export function importSaveFile(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'That file is not valid JSON.' };
  }
  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, error: 'That file does not look like an MLCars save.' };
  }
  if (typeof parsed.version !== 'number') {
    return { ok: false, error: 'That file has no version number.' };
  }
  if (parsed.version !== SAVE_VERSION) {
    return { ok: false, error: `That file is save format version ${parsed.version}, but this app uses version ${SAVE_VERSION}.` };
  }
  if (!parsed.settings || !parsed.tracks) {
    return { ok: false, error: 'That file is missing settings or track data.' };
  }
  return { ok: true, saveFile: parsed };
}
