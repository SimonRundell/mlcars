import { useEffect, useRef } from 'react';
import { CARS, MAX_DEVICE_PIXEL_RATIO } from '../constants.js';
import { getAction, steerSign } from '../sim/actions.js';
import { interpolateCarState } from '../sim/physics.js';
import { buildTrackLayer, trackWorldBounds } from '../render/trackLayer.js';
import { readPalette } from '../render/palette.js';
import { isImageReady, loadImage } from '../render/imageCache.js';
import { drawCar } from '../render/carSprite.js';
import { drawOrbitingStars, drawPoof } from '../render/effects.js';
import { computeLearnedLinePoints, drawCrashMark, drawLearnedLine, drawSensorRays } from '../render/overlays.js';

const CAR_COLOUR_KEYS = ['car1', 'car2', 'car3', 'car4', 'car5', 'car6'];

/**
 * The track canvas: the cached scenery layer, cars, learned lines and
 * crash effects, all read directly from the live World each frame
 * (BUILD.md section 8 - the canvas never waits for React's throttled
 * snapshot). Canvas colours always come from the CSS token palette.
 *
 * @param {Object} props
 * @param {import('../sim/world.js').World} props.world
 * @param {import('react').RefObject<Object[]>} props.effectsRef
 * @param {import('react').RefObject<Map>} props.learnedLineCacheRef
 * @param {import('react').RefObject<number>} props.interpAlphaRef Fraction into the current tick interval, for smooth 1x motion.
 * @param {boolean} props.reducedMotion
 * @param {string} props.ariaSummary Refreshed roughly every two seconds by the parent.
 * @param {number} [props.selectedCarIndex] In sensor mode, whose rays to draw (BUILD.md 13: only the selected car's).
 * @returns {JSX.Element}
 */
export function TrackCanvas({ world, effectsRef, learnedLineCacheRef, interpAlphaRef, reducedMotion, ariaSummary, selectedCarIndex }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const trackLayerRef = useRef(null);
  const paletteRef = useRef(null);
  const viewRef = useRef({ scale: 1, offsetX: 0, offsetY: 0 });
  const rafRef = useRef(null);
  const selectedCarIndexRef = useRef(selectedCarIndex);
  selectedCarIndexRef.current = selectedCarIndex;

  function rebuildTrackLayer() {
    paletteRef.current = readPalette();
    const logoUrl = world.trackDef.logo;
    let logoImage;
    if (logoUrl) {
      const img = loadImage(logoUrl);
      if (isImageReady(img)) {
        logoImage = img;
      } else {
        // Draw without the logo for now; once it loads, redo the cache
        // so the logo becomes a permanent part of it, same as the grass.
        img.addEventListener('load', () => rebuildTrackLayer(), { once: true });
      }
    }
    trackLayerRef.current = buildTrackLayer(world.track, paletteRef.current, logoImage);
  }

  function recomputeView() {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const dpr = Math.min(MAX_DEVICE_PIXEL_RATIO, window.devicePixelRatio || 1);
    const widthCss = container.clientWidth;
    const heightCss = container.clientHeight;
    canvas.width = Math.max(1, Math.round(widthCss * dpr));
    canvas.height = Math.max(1, Math.round(heightCss * dpr));
    canvas.style.width = `${widthCss}px`;
    canvas.style.height = `${heightCss}px`;

    const box = trackWorldBounds(world.track);
    const worldWidth = box.maxX - box.minX;
    const worldHeight = box.maxY - box.minY;
    const scale = Math.min((widthCss * dpr) / worldWidth, (heightCss * dpr) / worldHeight);
    const offsetX = (widthCss * dpr - worldWidth * scale) / 2 - box.minX * scale;
    const offsetY = (heightCss * dpr - worldHeight * scale) / 2 - box.minY * scale;
    viewRef.current = { scale, offsetX, offsetY };
  }

  useEffect(() => {
    rebuildTrackLayer();
    recomputeView();

    const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const onSchemeChange = () => rebuildTrackLayer();
    darkQuery.addEventListener('change', onSchemeChange);

    const resizeObserver = new ResizeObserver(() => recomputeView());
    if (containerRef.current) resizeObserver.observe(containerRef.current);

    return () => {
      darkQuery.removeEventListener('change', onSchemeChange);
      resizeObserver.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world]);

  useEffect(() => {
    function toScreen(p) {
      const v = viewRef.current;
      return { x: p.x * v.scale + v.offsetX, y: p.y * v.scale + v.offsetY };
    }

    function frame() {
      rafRef.current = requestAnimationFrame(frame);
      const ctx = canvasRef.current?.getContext('2d');
      const layer = trackLayerRef.current;
      const palette = paletteRef.current;
      if (!ctx || !layer || !palette) return;

      const view = viewRef.current;
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.drawImage(
        layer.canvas,
        (layer.originX * view.scale + view.offsetX) | 0,
        (layer.originY * view.scale + view.offsetY) | 0,
        layer.canvas.width * (view.scale / layer.scale),
        layer.canvas.height * (view.scale / layer.scale)
      );

      const settings = world.settings;
      const now = performance.now();

      for (let i = 0; i < CARS.length; i++) {
        const car = world.cars[i];
        const identity = CARS[i];

        if (settings.showLearnedLines && world.mode !== 'sensor') {
          const cache = learnedLineCacheRef.current;
          let entry = cache.get(i);
          if (!entry || entry.bestLength !== car.lineage.best.length) {
            const startState = world.startStateFor(i);
            const points = computeLearnedLinePoints(startState, car.lineage.best).map(toScreen);
            entry = { bestLength: car.lineage.best.length, points };
            cache.set(i, entry);
          }
          if (entry.points.length > 1) {
            const colourKey = CAR_COLOUR_KEYS[i];
            drawLearnedLine(ctx, entry.points, palette.carColours[i] || `var(--${colourKey})`, Math.max(1, 0.5 * view.scale));
          }
        }

        const drawState =
          car.prevState && !car.stopped
            ? interpolateCarState(car.prevState, car.state, interpAlphaRef.current)
            : car.state;
        const screenPos = toScreen(drawState);
        const activeEffect = effectsRef.current.find((e) => e.carIndex === i);

        if (car.stopped && settings.showCrashMarks && car.stopCause !== 'finished' && car.stopCause !== 'timeup') {
          drawCrashMark(ctx, screenPos.x, screenPos.y, 1.6 * view.scale, palette.colourDanger);
        }

        if (world.mode === 'sensor' && i === selectedCarIndexRef.current && car.lastSensorReading && !car.stopped) {
          drawSensorRays(
            ctx,
            screenPos,
            drawState.heading,
            car.lastSensorReading.rayDistances,
            view.scale,
            palette.carColours[i] || `var(--${CAR_COLOUR_KEYS[i]})`,
            Math.max(1, 0.4 * view.scale)
          );
        }

        let eyeState;
        if (activeEffect) eyeState = activeEffect.isNewBest ? 'newBest' : 'dizzy';
        else if (car.stopped) eyeState = 'locked';
        else eyeState = car.lastDecisionSource === 'locked' ? 'locked' : 'exploring';

        const steerDir = !car.stopped && car.currentActionIndex != null ? steerSign(getAction(car.currentActionIndex).steer) : 0;

        ctx.save();
        ctx.translate(screenPos.x, screenPos.y);
        ctx.rotate(drawState.heading);
        drawCar(ctx, {
          scale: view.scale,
          number: identity.number,
          bodyColour: palette.carColours[i],
          inkColour: palette.carInks[i],
          outlineColour: palette.colourInk,
          pattern: identity.pattern,
          eyeState,
          steerDirection: steerDir,
          faded: car.stopCause === 'finished',
          reducedMotion,
        });
        ctx.restore();

        if (activeEffect) {
          const age = (now - activeEffect.startedAt) / 1000;
          ctx.save();
          ctx.translate(screenPos.x, screenPos.y);
          drawPoof(ctx, view.scale, age, palette.colourInk, palette.colourSurface);
          drawOrbitingStars(ctx, view.scale, age, palette.colourAccent, reducedMotion);
          ctx.restore();
        }
      }
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world, reducedMotion]);

  return (
    <div className="track-canvas-container" ref={containerRef}>
      <canvas ref={canvasRef} className="track-canvas" role="img" aria-label={ariaSummary} />
    </div>
  );
}
