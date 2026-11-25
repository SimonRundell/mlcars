import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { TICKS_PER_STEP, TURBO_FRAME_BUDGET_MS, SPEED_OPTIONS } from '../constants.js';
import { World, defaultSettings } from '../sim/world.js';
import { rewindStepFor } from '../sim/routeBrain.js';
import { DURATION_SECONDS as EFFECT_DURATION_SECONDS } from '../render/effects.js';

/**
 * Build the Round report drawer's row data for one round: what each car
 * did, and a plain-English plan for its next round (BUILD.md 3.3 - "the
 * single most important teaching view").
 *
 * @param {import('../sim/world.js').World} world
 * @param {{roundNumber: number, results: Object[]}} payload The 'roundEnded' event payload.
 * @param {Object<number, boolean>} newBestByCarIndex Captured from each car's 'carStopped' event this round.
 * @returns {Object}
 */
function buildRoundReport(world, payload, newBestByCarIndex) {
  const isSensor = world.mode === 'sensor';
  const rows = payload.results.map((r) => {
    const lineage = world.lineages[r.carIndex];
    let plan;
    if (lineage.finished) {
      plan = 'Finished! Not learning further until the lap target rises.';
    } else if (isSensor) {
      plan = !world.learningEnabled
        ? 'Transfer test: learning is off. Running the same network again.'
        : r.mutationKept
          ? `Kept this round's small random change to the network - it travelled further.`
          : 'Tried a small random change to the network. No further than its parent, so the parent stays.';
    } else if (r.efficiencyWin) {
      plan = `Found a faster way to the same distance (now ${lineage.best.length} steps). Still looking for a quicker one.`;
    } else if (r.backtrackJump > 1) {
      const nextRewindStep = rewindStepFor(lineage);
      plan = `Kept crashing in the same spot, so it jumped back ${r.backtrackJump} steps at once. Trying something new at step ${nextRewindStep}.`;
    } else {
      const nextRewindStep = rewindStepFor(lineage);
      plan = `Keep the first ${nextRewindStep} move${nextRewindStep === 1 ? '' : 's'}, try something new at step ${nextRewindStep}.`;
    }
    return {
      carIndex: r.carIndex,
      distance: r.distance,
      cause: r.cause,
      isNewBest: Boolean(newBestByCarIndex[r.carIndex]),
      isEfficiencyWin: Boolean(r.efficiencyWin),
      plan,
    };
  });
  return { roundNumber: payload.roundNumber, rows };
}

const SNAPSHOT_INTERVAL_MS = 100; // ~10 times a second, per BUILD.md section 5.

/**
 * @typedef {Object} PauseSwitches
 * @property {boolean} onNewChoice Pause the moment any car reaches its rewind point.
 * @property {boolean} onCrash Pause the moment any car stops, for any reason.
 * @property {boolean} onRoundEnd Pause once every car has stopped and the round is over.
 */

/** @returns {PauseSwitches} */
function defaultPauseSwitches() {
  return { onNewChoice: false, onCrash: false, onRoundEnd: false };
}

/**
 * Owns a World instance for one track and drives it: the fixed-step
 * accumulator loop, play/pause/step/speed controls, pause switches, and
 * a throttled React snapshot (BUILD.md section 5 - React re-renders at
 * most ~10 times a second; the canvas instead reads `world` directly
 * every animation frame).
 *
 * @param {Object} args
 * @param {import('../tracks/index.js').TrackDef} args.trackDef
 * @param {number} args.seed
 * @param {Partial<import('../sim/world.js').WorldSettings>} [args.settings]
 * @param {Object} [args.saved] This track's previously serialized data.
 * @param {'route'|'sensor'} [args.mode] Learning mode (BUILD.md 13).
 * @param {boolean} [args.learningEnabled] False for a frozen Transfer test run.
 * @param {string} [args.sessionKey] Identifies "this should be a fresh World" - trackDef alone is not enough once the same track can be visited in different modes, or as a non-persisted Transfer test run. Defaults to trackDef.id.
 * @param {boolean} [args.startPaused] Open paused (BUILD.md 10: true when reduced motion is on).
 * @param {(trackSave: Object) => void} [args.onRoundEnded] Called with world.serialize() after every round, for the caller to persist.
 * @returns {Object}
 */
export function useWorld({ trackDef, seed, settings, saved, mode, learningEnabled, sessionKey, startPaused, onRoundEnded }) {
  const worldRef = useRef(null);
  const effectsRef = useRef([]); // [{carIndex, cause, x, y, startedAt}], read directly by TrackCanvas
  const learnedLineCacheRef = useRef(new Map()); // carIndex -> { bestLength, points }
  const storeRef = useRef({ snapshot: null, listeners: new Set() });
  const playingRef = useRef(!startPaused);
  const speedIdRef = useRef('1x');
  const pauseSwitchesRef = useRef(defaultPauseSwitches());
  const rafRef = useRef(null);
  const lastFrameTimeRef = useRef(null);
  const accumulatorRef = useRef(0);
  const lastSnapshotAtRef = useRef(0);
  const newBestThisRoundRef = useRef({});
  const lastRoundReportRef = useRef(null);
  const interpAlphaRef = useRef(0);

  const key = sessionKey ?? trackDef.id;
  if (worldRef.current === null || worldRef.current.sessionKey !== key) {
    worldRef.current = new World({ trackDef, seed, settings: settings ?? defaultSettings(), saved, mode, learningEnabled });
    worldRef.current.sessionKey = key;
    effectsRef.current = [];
    learnedLineCacheRef.current = new Map();
  }
  const world = worldRef.current;

  const notify = useCallback(() => {
    for (const listener of storeRef.current.listeners) listener();
  }, []);

  const pushSnapshot = useCallback(() => {
    storeRef.current.snapshot = world.snapshot();
    notify();
  }, [world, notify]);

  if (storeRef.current.snapshot === null) pushSnapshot();

  const subscribe = useCallback((listener) => {
    storeRef.current.listeners.add(listener);
    return () => storeRef.current.listeners.delete(listener);
  }, []);
  const getSnapshot = useCallback(() => storeRef.current.snapshot, []);

  const snapshot = useSyncExternalStore(subscribe, getSnapshot);

  const play = useCallback(() => {
    playingRef.current = true;
    pushSnapshot();
  }, [pushSnapshot]);
  const pause = useCallback(() => {
    playingRef.current = false;
    pushSnapshot();
  }, [pushSnapshot]);
  const togglePlay = useCallback(() => (playingRef.current ? pause() : play()), [play, pause]);

  const setSpeed = useCallback(
    (speedId) => {
      speedIdRef.current = speedId;
      pushSnapshot();
    },
    [pushSnapshot]
  );

  const setPauseSwitches = useCallback(
    (partial) => {
      pauseSwitchesRef.current = { ...pauseSwitchesRef.current, ...partial };
      pushSnapshot();
    },
    [pushSnapshot]
  );

  // Wire world events to effects (for the canvas), pause switches, and
  // the round-ended persistence callback.
  useEffect(() => {
    return world.subscribe((event) => {
      if (event.type === 'carStopped') {
        const car = world.cars[event.payload.carIndex];
        effectsRef.current.push({
          carIndex: event.payload.carIndex,
          cause: event.payload.cause,
          x: car.state.x,
          y: car.state.y,
          startedAt: performance.now(),
        });
        if (event.payload.isNewBest) newBestThisRoundRef.current[event.payload.carIndex] = true;
        if (pauseSwitchesRef.current.onCrash) playingRef.current = false;
      } else if (event.type === 'rewindPointReached') {
        if (pauseSwitchesRef.current.onNewChoice) playingRef.current = false;
      } else if (event.type === 'roundEnded') {
        lastRoundReportRef.current = buildRoundReport(world, event.payload, newBestThisRoundRef.current);
        newBestThisRoundRef.current = {};
        if (pauseSwitchesRef.current.onRoundEnd) playingRef.current = false;
        onRoundEnded?.(world.serialize());
      }
      pushSnapshot();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world]);

  // The fixed-step accumulator loop (BUILD.md section 5): speed only
  // changes how many ticks run per animation frame, never the result.
  useEffect(() => {
    function frame(now) {
      rafRef.current = requestAnimationFrame(frame);
      if (lastFrameTimeRef.current == null) lastFrameTimeRef.current = now;
      const frameDeltaMs = Math.min(100, now - lastFrameTimeRef.current);
      lastFrameTimeRef.current = now;

      if (playingRef.current) {
        const speedOption = SPEED_OPTIONS.find((s) => s.id === speedIdRef.current) ?? SPEED_OPTIONS[0];
        if (speedOption.id === 'turbo') {
          const turboStart = performance.now();
          while (performance.now() - turboStart < TURBO_FRAME_BUDGET_MS) {
            world.tick();
          }
        } else {
          accumulatorRef.current += frameDeltaMs;
          const tickMs = 1000 / 60;
          const ticksThisFrame = speedOption.ticksPerFrame;
          let ran = 0;
          while (accumulatorRef.current >= tickMs && ran < ticksThisFrame * 4) {
            for (let i = 0; i < ticksThisFrame; i++) world.tick();
            accumulatorRef.current -= tickMs;
            ran += ticksThisFrame;
          }
          interpAlphaRef.current = speedOption.id === '1x' ? Math.max(0, Math.min(1, accumulatorRef.current / tickMs)) : 1;
        }
      } else {
        interpAlphaRef.current = 1;
      }

      if (now - lastSnapshotAtRef.current >= SNAPSHOT_INTERVAL_MS) {
        lastSnapshotAtRef.current = now;
        pushSnapshot();
      }

      effectsRef.current = effectsRef.current.filter((e) => (performance.now() - e.startedAt) / 1000 < EFFECT_DURATION_SECONDS);
    }
    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world]);

  const step = useCallback(() => {
    for (let i = 0; i < TICKS_PER_STEP; i++) world.tick();
    pushSnapshot();
  }, [world, pushSnapshot]);

  const restartRound = useCallback(() => {
    world.restartRound();
    effectsRef.current = [];
    pushSnapshot();
  }, [world, pushSnapshot]);

  const resetLearning = useCallback(() => {
    world.resetLearning();
    effectsRef.current = [];
    learnedLineCacheRef.current = new Map();
    pushSnapshot();
  }, [world, pushSnapshot]);

  const updateSettings = useCallback(
    (partial) => {
      world.updateSettings(partial);
      pushSnapshot();
    },
    [world, pushSnapshot]
  );

  const newSeed = useCallback(
    (nextSeed) => {
      world.newSeed(nextSeed);
      effectsRef.current = [];
      learnedLineCacheRef.current = new Map();
      pushSnapshot();
    },
    [world, pushSnapshot]
  );

  return useMemo(
    () => ({
      world,
      snapshot,
      effectsRef,
      learnedLineCacheRef,
      interpAlphaRef,
      lastRoundReport: lastRoundReportRef.current,
      playing: playingRef.current,
      speedId: speedIdRef.current,
      pauseSwitches: pauseSwitchesRef.current,
      play,
      pause,
      togglePlay,
      setSpeed,
      setPauseSwitches,
      step,
      restartRound,
      resetLearning,
      updateSettings,
      newSeed,
    }),
    [world, snapshot, play, pause, togglePlay, setSpeed, setPauseSwitches, step, restartRound, resetLearning, updateSettings, newSeed]
  );
}
