/**
 * A tiny module-level cache so each circuit logo image (BUILD.md 12/13
 * branding assets, served from /public) is only ever requested once per
 * page load, however many times a track is revisited.
 */

const cache = new Map();

/**
 * Get (or start loading) the image at `url`. Returns the same
 * `HTMLImageElement` on every call for the same url.
 *
 * @param {string} url
 * @returns {HTMLImageElement}
 */
export function loadImage(url) {
  let img = cache.get(url);
  if (!img) {
    img = new Image();
    img.src = url;
    cache.set(url, img);
  }
  return img;
}

/**
 * Whether an image returned by loadImage has finished loading
 * successfully (as opposed to still pending, or failed).
 *
 * @param {HTMLImageElement} img
 * @returns {boolean}
 */
export function isImageReady(img) {
  return img.complete && img.naturalWidth > 0;
}
