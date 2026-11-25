/**
 * The round loop: owns car runtime state for one track, steps physics,
 * applies collisions, drives the route-learning lineages between rounds,
 * and emits events. No React, no DOM (BUILD.md section 8) - the canvas
 * reads this object's live state directly each frame, and the
 * useWorld hook wraps it for React via useSyncExternalStore.
 */

import { getAction } from './actions.js';
import { checkCarCarHit, checkTrackEdgeHit } from './collisions.js';
import {
  CAR_COUNT,
  CARS,
  DEFAULT_BASE_REWIND,
  DEFAULT_BIG_REWIND_JUMP,
  DEFAULT_COLLISIONS_ON,
  DEFAULT_LAP_TARGET,
  DEFAULT_MUTATION_SIGMA,
  DEFAULT_OPTIMIZE_FOR_SPEED,
  DEFAULT_PATIENCE,
  DEFAULT_ROUND_PAUSE_SECONDS,
  DEFAULT_SHOW_CRASH_MARKS,
  DEFAULT_SHOW_LEARNED_LINES,
  DEFAULT_STICKINESS,
  HISTORY_CAP,
  MIN_SPEED,
  START_GRID_OFFSETS,
  TICKS_PER_SECOND,
  TICKS_PER_STEP,
  WRONG_WAY_DISTANCE,
  roundStepLimit,
} from '../constants.js';
import { stepPhysicsTick } from './physics.js';
import { carStream, cloneStream } from './rng.js';
import { createLineage, decideAction, planNextRound, rewindStepFor } from './routeBrain.js';
import {
  createLineage as createNeuralLineage,
  forward,
  mutate,
  outputsToActionIndex,
  selectNextRound,
} from './neuralBrain.js';
import { readSensors } from './sensors.js';
import { buildTrack, locateOnTrack } from './track.js';

const TICK_SECONDS = 1 / TICKS_PER_SECOND;
const NEAREST_WINDOW = 12;

/**
 * @typedef {Object} WorldSettings
 * @property {number} baseRewind
 * @property {number} patience
 * @property {number} stickiness
 * @property {number} lapTarget
 * @property {boolean} collisionsOn
 * @property {boolean} showLearnedLines
 * @property {boolean} showCrashMarks
 * @property {number} roundPauseSeconds
 * @property {boolean} optimizeForSpeed Once a lineage has banked a lap, accept a round that matches (not just beats) its best distance in fewer steps (BUILD.md 4.3a).
 * @property {number} bigRewindJump Steps to jump back in one go when recent crashes at a rewind point cluster in the same spot, instead of the usual +1 (BUILD.md 4.3).
 * @property {number} mutationSigma Phase 3: standard deviation of the random nudge applied to a parent network's weights each round (BUILD.md 13).
 */

/** @returns {WorldSettings} */
export function defaultSettings() {
  return {
    baseRewind: DEFAULT_BASE_REWIND,
    patience: DEFAULT_PATIENCE,
    stickiness: DEFAULT_STICKINESS,
    lapTarget: DEFAULT_LAP_TARGET,
    collisionsOn: DEFAULT_COLLISIONS_ON,
    showLearnedLines: DEFAULT_SHOW_LEARNED_LINES,
    showCrashMarks: DEFAULT_SHOW_CRASH_MARKS,
    roundPauseSeconds: DEFAULT_ROUND_PAUSE_SECONDS,
    optimizeForSpeed: DEFAULT_OPTIMIZE_FOR_SPEED,
    bigRewindJump: DEFAULT_BIG_REWIND_JUMP,
    mutationSigma: DEFAULT_MUTATION_SIGMA,
  };
}

/**
 * @typedef {Object} WorldEvent
 * @property {string} type One of 'roundStarted', 'rewindPointReached', 'carStopped', 'roundEnded', 'allFinished', 'settingsChanged', 'learningReset'.
 * @property {Object} payload
 */

export class World {
  /**
   * @param {Object} args
   * @param {import('../tracks/index.js').TrackDef} args.trackDef
   * @param {number} args.seed
   * @param {Partial<WorldSettings>} [args.settings]
   * @param {Object} [args.saved] Previously serialized track data (see serialize()).
   * @param {'route'|'sensor'} [args.mode] Learning mode (BUILD.md 13). Defaults to 'route'.
   * @param {boolean} [args.learningEnabled] False for the frozen Transfer test run: sensor-mode cars use their parent weights with no mutation and never select a new parent (route mode is unaffected - BUILD.md's whole point is that it fails at once on a new track regardless).
   */
  constructor({ trackDef, seed, settings, saved, mode, learningEnabled }) {
    this.trackDef = trackDef;
    this.track = buildTrack(trackDef);
    this.seed = saved?.seed ?? seed;
    this.mode = mode ?? 'route';
    this.learningEnabled = learningEnabled ?? true;
    // Settings are global across tracks (BUILD.md section 9), so they are
    // always passed in fresh by the caller, never restored per-track here.
    this.settings = { ...defaultSettings(), ...settings };
    this.listeners = new Set();

    this.roundNumber = saved?.roundNumber ?? 1;
    this.roundStepLimitValue = roundStepLimit(this.track.length, this.settings.lapTarget);
    // Streams must exist before lineages: a fresh sensor-mode lineage needs
    // its car's own stream to randomly initialise a network.
    this.streams = CARS.map((_, i) => carStream(this.seed, i));
    this.roundStartStreams = this.streams.map((s) => cloneStream(s));

    this.lineages = saved?.lineages ? this._restoreLineages(saved.lineages) : this._freshLineages();
    this.history = saved?.history ? saved.history.map((h) => h.slice()) : CARS.map(() => []);

    this.roundTickCount = 0;
    this.cars = [];
    this._startRound();
  }

  /** @returns {Object[]} A fresh lineage per car, shaped for this World's mode. */
  _freshLineages() {
    return this.mode === 'sensor'
      ? CARS.map((_, i) => createNeuralLineage(this.streams[i]))
      : CARS.map(() => createLineage(this.settings.baseRewind));
  }

  /** @param {Object[]} saved @returns {Object[]} Saved lineages, deep-cloned where they hold nested mutable state. */
  _restoreLineages(saved) {
    if (this.mode === 'sensor') return saved.map((l) => ({ ...l }));
    return saved.map((l) => ({ ...l, tried: { ...l.tried }, crashLocations: { ...l.crashLocations } }));
  }

  /**
   * @param {(event: WorldEvent) => void} listener
   * @returns {() => void} Unsubscribe function.
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** @param {string} type @param {Object} payload */
  _emit(type, payload) {
    for (const listener of this.listeners) listener({ type, payload });
  }

  /**
   * The fixed start-grid state for one car (BUILD.md 5: grid positions
   * never rotate between rounds). Exposed publicly so the renderer can
   * replay a lineage's best route from the same starting point to draw
   * the learned line, without duplicating this placement maths.
   *
   * @param {number} carIndex
   * @returns {import('./physics.js').CarState}
   */
  startStateFor(carIndex) {
    const startSample = this.track.samples[this.track.startSampleIndex];
    const heading = Math.atan2(startSample.tangent.y, startSample.tangent.x);
    const offset = START_GRID_OFFSETS[carIndex];
    const x = startSample.x + startSample.tangent.x * offset.forward + startSample.normal.x * offset.lateral;
    const y = startSample.y + startSample.tangent.y * offset.forward + startSample.normal.y * offset.lateral;
    return { x, y, heading, speed: MIN_SPEED };
  }

  /** Place all six cars on the start grid and prepare them to run a round. */
  _startRound() {
    this.roundTickCount = 0;
    const isSensor = this.mode === 'sensor';

    this.cars = CARS.map((identity, i) => {
      const lineage = this.lineages[i];
      const state = this.startStateFor(i);
      const startLocation = locateOnTrack(this.track, state, NEAREST_WINDOW, this.track.startSampleIndex);

      const finished = lineage.finished;
      // Sensor mode (BUILD.md 13): this round's candidate network is the
      // parent plus a small mutation, chosen once up front - there is no
      // rewind or replay to compute, every step is a fresh reaction to
      // live sensors. The frozen Transfer test run (learningEnabled false)
      // skips the mutation entirely and just re-runs the parent as-is.
      const candidateWeights = isSensor
        ? this.learningEnabled
          ? mutate(lineage.parent, this.streams[i], this.settings.mutationSigma)
          : lineage.parent
        : null;

      return {
        index: i,
        identity,
        lineage,
        rewindStep: isSensor ? 0 : rewindStepFor(lineage),
        candidateWeights,
        lastSensorReading: null,
        lastActivation: null,
        state,
        prevState: state,
        lastTrackIndex: startLocation.index,
        lastRawProgress: startLocation.progress,
        totalDistance: 0,
        maxDistanceReached: 0,
        lapsDone: 0,
        matchStep: null,
        stopped: finished,
        stopCause: finished ? 'finished' : null,
        collidable: !finished,
        route: [],
        prevActionIndex: null,
        currentActionIndex: null,
        lastDecisionSource: null,
      };
    });

    this._emit('roundStarted', { roundNumber: this.roundNumber });
  }

  /**
   * Fold a new centreline location into a car's running totalDistance,
   * unwrapping lap crossings so distance stays monotonic-ish and
   * continuous across laps (BUILD.md 4.5). Also records `matchStep`:
   * the first decision step this round at which the car reaches the
   * distance its lineage already had at the start of the round - the
   * benchmark the efficiency phase (4.3a) tries to beat in fewer steps.
   *
   * @param {Object} car
   * @param {import('./track.js').TrackLocation} location
   * @param {number} stepIndex Current decision step, for matchStep bookkeeping.
   */
  _updateProgress(car, location, stepIndex) {
    let delta = location.progress - car.lastRawProgress;
    const half = this.track.length / 2;
    if (delta > half) delta -= this.track.length;
    else if (delta < -half) delta += this.track.length;
    car.totalDistance += delta;
    car.lastRawProgress = location.progress;
    car.lapsDone = Math.max(0, Math.floor(car.totalDistance / this.track.length));
    if (car.totalDistance > car.maxDistanceReached) car.maxDistanceReached = car.totalDistance;
    if (car.matchStep == null && car.totalDistance >= car.lineage.bestDistance) car.matchStep = stepIndex;
  }

  /**
   * Mark a car stopped. If `finalState`/`location` are given, that state
   * and progress are committed first (used for wall/car-to-car stops,
   * which end the car exactly where the collision happened).
   *
   * @param {Object} car
   * @param {string} cause 'wall' | `car:${number}` | 'wrongway' | 'timeup' | 'finished'
   * @param {number} stepIndex
   * @param {import('./physics.js').CarState} [finalState]
   * @param {import('./track.js').TrackLocation} [location]
   */
  _stopCar(car, cause, stepIndex, finalState, location) {
    if (finalState) {
      car.prevState = car.state;
      car.state = finalState;
    }
    if (location) {
      car.lastTrackIndex = location.index;
      this._updateProgress(car, location, stepIndex);
    }
    car.stopped = true;
    car.stopCause = cause;
    car.stoppedAtStep = stepIndex;
    const isNewBest = car.totalDistance > car.lineage.bestDistance;
    this._emit('carStopped', {
      carIndex: car.index,
      cause,
      distance: car.totalDistance,
      step: stepIndex,
      isNewBest,
      roundNumber: this.roundNumber,
    });
  }

  /** Advance the simulation by exactly one fixed physics tick (1/60s). Safe to call even if the round has already ended (it will have auto-started the next one). */
  tick() {
    const stepIndex = Math.floor(this.roundTickCount / TICKS_PER_STEP);
    const isDecisionBoundary = this.roundTickCount % TICKS_PER_STEP === 0;

    const tentative = new Array(CAR_COUNT);

    for (let i = 0; i < CAR_COUNT; i++) {
      const car = this.cars[i];
      tentative[i] = car.state;
      if (car.stopped) continue;

      if (isDecisionBoundary) {
        if (stepIndex >= this.roundStepLimitValue) {
          this._stopCar(car, 'timeup', stepIndex);
          tentative[i] = car.state;
          continue;
        }
        if (this.mode === 'sensor') {
          const otherStates = this.cars.filter((c) => c.index !== i).map((c) => c.state);
          const reading = readSensors(car.state, this.track, car.lastTrackIndex, otherStates);
          const activation = forward(car.candidateWeights, reading.inputs);
          car.currentActionIndex = outputsToActionIndex(activation.outputs);
          car.lastDecisionSource = 'sensor';
          car.lastSensorReading = reading;
          car.lastActivation = activation;
          car.prevActionIndex = car.currentActionIndex;
        } else {
          const decision = decideAction(
            car.lineage,
            car.rewindStep,
            stepIndex,
            car.prevActionIndex,
            this.streams[i],
            this.settings.stickiness
          );
          car.currentActionIndex = decision.actionIndex;
          car.lastDecisionSource = decision.source;
          car.route.push(decision.actionIndex);
          car.prevActionIndex = decision.actionIndex;
          if (decision.source === 'new') {
            this._emit('rewindPointReached', { carIndex: i, roundNumber: this.roundNumber, step: stepIndex });
          }
        }
      }

      const action = getAction(car.currentActionIndex);
      tentative[i] = stepPhysicsTick(car.state, action, TICK_SECONDS);
    }

    const wallStop = new Array(CAR_COUNT).fill(false);
    const newLocation = new Array(CAR_COUNT).fill(null);
    for (let i = 0; i < CAR_COUNT; i++) {
      const car = this.cars[i];
      if (car.stopped) continue;
      const { hit, location } = checkTrackEdgeHit(tentative[i], this.track, car.lastTrackIndex);
      newLocation[i] = location;
      if (hit) wallStop[i] = true;
    }

    const carStop = new Array(CAR_COUNT).fill(null);
    if (this.settings.collisionsOn) {
      for (let i = 0; i < CAR_COUNT; i++) {
        const carA = this.cars[i];
        if (carA.stopped) continue;
        for (let j = 0; j < CAR_COUNT; j++) {
          if (j === i) continue;
          const carB = this.cars[j];
          if (carB.stopped && !carB.collidable) continue;
          const stateB = carB.stopped ? carB.state : tentative[j];
          if (checkCarCarHit(tentative[i], stateB)) {
            carStop[i] = carB.identity.number;
            break;
          }
        }
      }
    }

    for (let i = 0; i < CAR_COUNT; i++) {
      const car = this.cars[i];
      if (car.stopped) continue;

      if (wallStop[i]) {
        this._stopCar(car, 'wall', stepIndex, tentative[i], newLocation[i]);
        continue;
      }
      if (carStop[i] != null) {
        this._stopCar(car, `car:${carStop[i]}`, stepIndex, tentative[i], newLocation[i]);
        continue;
      }

      car.prevState = car.state;
      car.state = tentative[i];
      this._updateProgress(car, newLocation[i], stepIndex);

      if (car.totalDistance >= this.settings.lapTarget * this.track.length) {
        car.collidable = false;
        this._stopCar(car, 'finished', stepIndex);
        continue;
      }
      if (car.totalDistance < car.maxDistanceReached - WRONG_WAY_DISTANCE) {
        this._stopCar(car, 'wrongway', stepIndex);
        continue;
      }
      car.lastTrackIndex = newLocation[i].index;
    }

    this.roundTickCount++;

    if (this.cars.every((c) => c.stopped)) {
      this._endRound();
    }
  }

  /** Called internally once every car has stopped: plans the next round for every lineage and starts it. */
  _endRound() {
    const isSensor = this.mode === 'sensor';
    const results = this.cars.map((car) => ({
      carIndex: car.index,
      distance: car.totalDistance,
      cause: car.stopCause,
      lapsDone: car.lapsDone,
      finished: car.stopCause === 'finished',
      route: car.route,
      matchStep: car.matchStep,
    }));

    const finishedRoundNumber = this.roundNumber;
    const oldLineages = this.lineages;
    this.lineages = this.lineages.map((lineage, i) => {
      const r = results[i];
      if (isSensor) {
        if (!this.learningEnabled) return lineage; // Transfer test: the parent never changes.
        return selectNextRound(
          lineage,
          this.cars[i].candidateWeights,
          { distance: r.distance, lapsDone: r.lapsDone, finished: r.finished },
          finishedRoundNumber
        );
      }
      return planNextRound(
        lineage,
        { route: r.route, distance: r.distance, lapsDone: r.lapsDone, finished: r.finished, matchStep: r.matchStep },
        {
          baseRewind: this.settings.baseRewind,
          patience: this.settings.patience,
          optimizeForSpeed: this.settings.optimizeForSpeed,
          bigRewindJump: this.settings.bigRewindJump,
          trackLength: this.track.length,
        },
        finishedRoundNumber
      );
    });

    for (let i = 0; i < CAR_COUNT; i++) {
      if (isSensor) {
        // A round whose mutated weights became the new parent (BUILD.md 13).
        results[i].efficiencyWin = false;
        results[i].backtrackJump = 0;
        results[i].mutationKept = this.lineages[i] !== oldLineages[i];
      } else {
        // A round that matched the old best distance in fewer steps than before, without exceeding it (BUILD.md 4.3a).
        results[i].efficiencyWin =
          this.lineages[i].bestDistance === oldLineages[i].bestDistance && this.lineages[i].best.length < oldLineages[i].best.length;
        // How far rewind just jumped, so the UI can tell a same-spot big jump apart from the usual +1 (BUILD.md 4.3).
        results[i].backtrackJump = Math.max(0, this.lineages[i].rewind - oldLineages[i].rewind);
      }
      this.history[i].push({ round: finishedRoundNumber, bestDistance: this.lineages[i].bestDistance });
      if (this.history[i].length > HISTORY_CAP) this._thinHistory(i);
    }

    this._emit('roundEnded', { roundNumber: finishedRoundNumber, results });

    if (this.lineages.every((l) => l.finished)) {
      this._emit('allFinished', { lapTarget: this.settings.lapTarget });
    }

    this.roundNumber = finishedRoundNumber + 1;
    this.streams.forEach((s, i) => (this.roundStartStreams[i] = cloneStream(s)));
    this._startRound();
  }

  /** Halve the resolution of the oldest half of a car's history once it grows past the cap. @param {number} carIndex */
  _thinHistory(carIndex) {
    const hist = this.history[carIndex];
    const half = Math.floor(hist.length / 2);
    const thinnedOld = hist.slice(0, half).filter((_, i) => i % 2 === 0);
    this.history[carIndex] = thinnedOld.concat(hist.slice(half));
  }

  /** Abandon the round in progress and replay it from the start, with identical randomness (same lineages, same RNG state as when it began). */
  restartRound() {
    this.streams = this.roundStartStreams.map((s) => cloneStream(s));
    this._startRound();
  }

  /** Clear this track's learning entirely (all six lineages and history), after the caller has confirmed with the person. Settings are left untouched. */
  resetLearning() {
    this.roundNumber = 1;
    this.streams = CARS.map((_, i) => carStream(this.seed, i));
    this.roundStartStreams = this.streams.map((s) => cloneStream(s));
    this.lineages = this._freshLineages();
    this.history = CARS.map(() => []);
    this._startRound();
    this._emit('learningReset', {});
  }

  /** Pick a new seed and reset learning to match (a seed only makes sense paired with the history it produced). @param {number} seed */
  newSeed(seed) {
    this.seed = seed;
    this.resetLearning();
  }

  /** @param {Partial<WorldSettings>} partial */
  updateSettings(partial) {
    const prevLapTarget = this.settings.lapTarget;
    this.settings = { ...this.settings, ...partial };

    if (typeof partial.lapTarget === 'number' && partial.lapTarget !== prevLapTarget) {
      this.roundStepLimitValue = roundStepLimit(this.track.length, this.settings.lapTarget);
      const targetDistance = this.settings.lapTarget * this.track.length;
      this.lineages = this.lineages.map((l) =>
        l.finished && l.bestDistance < targetDistance ? { ...l, finished: false } : l
      );
      this._startRound();
    }

    this._emit('settingsChanged', { settings: this.settings });
  }

  /**
   * Plain-object snapshot for the React side (BUILD.md 8: the UI reads
   * through a throttled store, never on every frame). The canvas instead
   * reads `this.cars[i].state` / `.prevState` directly each frame.
   *
   * @returns {Object}
   */
  snapshot() {
    const isSensor = this.mode === 'sensor';
    return {
      roundNumber: this.roundNumber,
      seed: this.seed,
      settings: this.settings,
      mode: this.mode,
      learningEnabled: this.learningEnabled,
      roundStepLimit: this.roundStepLimitValue,
      cars: this.cars.map((car) => ({
        index: car.index,
        stopped: car.stopped,
        stopCause: car.stopCause,
        distance: car.totalDistance,
        lapsDone: car.lapsDone,
        rewindStep: car.rewindStep,
        routeLength: car.route.length,
        currentActionIndex: car.currentActionIndex,
        lastDecisionSource: car.lastDecisionSource,
        bestDistance: car.lineage.bestDistance,
        bestRound: car.lineage.bestRound,
        rewind: car.lineage.rewind,
        failures: car.lineage.failures,
        tried: car.lineage.tried,
        finished: car.lineage.finished,
        sensorReading: isSensor ? car.lastSensorReading : null,
        activation: isSensor ? car.lastActivation : null,
      })),
    };
  }

  /**
   * Everything needed to resume this track later (BUILD.md section 9):
   * seed, round count, the six lineages and their history. Settings are
   * global and saved separately by the caller (persistence.js).
   *
   * @returns {Object}
   */
  serialize() {
    return {
      seed: this.seed,
      roundNumber: this.roundNumber,
      lineages: this.lineages,
      history: this.history,
    };
  }
}
