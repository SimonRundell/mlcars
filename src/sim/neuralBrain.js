/**
 * Phase 3 learning: sensor cars (BUILD.md section 13). A small fully
 * connected network reacts to the current sensor reading every step -
 * there is no stored route, no replay and no rewind. Learning is
 * mutation and selection: each round a car tries its parent's weights
 * plus a small random nudge, and keeps the result only if it travels
 * further than the parent did. Deliberately free of React and the DOM,
 * same as routeBrain.js, and free of Math.random - all randomness comes
 * from the car's own rng.js stream, so a seed reproduces a sensor car's
 * whole history just as faithfully as a route car's.
 *
 * Teaching note: weights are shown only as a picture and as numbers in
 * the Brain drawer, never described as "thinking" - see the About
 * drawer and the "Sensors and neural networks" concept card.
 */

import { gaussian } from './rng.js';
import {
  NETWORK_HIDDEN_SIZE,
  NETWORK_INIT_SIGMA,
  NETWORK_INPUT_SIZE,
  NETWORK_OUTPUT_SIZE,
} from '../constants.js';

/**
 * @typedef {Object} NetworkWeights
 * @property {number[][]} w1 Hidden layer weights, [hiddenSize][inputSize].
 * @property {number[]} b1 Hidden layer biases, [hiddenSize].
 * @property {number[][]} w2 Output layer weights, [outputSize][hiddenSize].
 * @property {number[]} b2 Output layer biases, [outputSize].
 */

/**
 * @typedef {Object} Lineage
 * @property {NetworkWeights} parent The current best network.
 * @property {number} bestDistance Distance the parent reached, in metres of track.
 * @property {number} lapsDone Laps completed by the parent.
 * @property {boolean} finished True once the lap target is reached.
 * @property {number} bestRound Round number (1-based) when `parent` was last replaced.
 */

/** @param {() => number} draw @returns {number[][]} @param {number} rows @param {number} cols */
function randomMatrix(rows, cols, draw) {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, draw));
}

/**
 * A freshly, randomly initialised network, small enough that it starts
 * out doing something rather than nothing (an all-zero network always
 * outputs tanh(0) = 0, which is "hold + straight" every single step).
 *
 * @param {import('./rng.js').RngStream} stream
 * @returns {NetworkWeights}
 */
export function randomWeights(stream) {
  const draw = () => gaussian(stream, NETWORK_INIT_SIGMA);
  return {
    w1: randomMatrix(NETWORK_HIDDEN_SIZE, NETWORK_INPUT_SIZE, draw),
    b1: Array.from({ length: NETWORK_HIDDEN_SIZE }, draw),
    w2: randomMatrix(NETWORK_OUTPUT_SIZE, NETWORK_HIDDEN_SIZE, draw),
    b2: Array.from({ length: NETWORK_OUTPUT_SIZE }, draw),
  };
}

/**
 * A fresh lineage with a randomly initialised parent network.
 *
 * @param {import('./rng.js').RngStream} stream
 * @returns {Lineage}
 */
export function createLineage(stream) {
  return {
    parent: randomWeights(stream),
    bestDistance: 0,
    lapsDone: 0,
    finished: false,
    bestRound: 0,
  };
}

/**
 * A copy of `weights` with every value nudged by independent gaussian
 * noise - the "child" tried each round.
 *
 * @param {NetworkWeights} weights
 * @param {import('./rng.js').RngStream} stream
 * @param {number} sigma Mutation standard deviation (Settings drawer).
 * @returns {NetworkWeights}
 */
export function mutate(weights, stream, sigma) {
  const nudge = (v) => v + gaussian(stream, sigma);
  return {
    w1: weights.w1.map((row) => row.map(nudge)),
    b1: weights.b1.map(nudge),
    w2: weights.w2.map((row) => row.map(nudge)),
    b2: weights.b2.map(nudge),
  };
}

/**
 * @typedef {Object} NetworkActivation
 * @property {number[]} inputs
 * @property {number[]} hidden Post-tanh hidden activations, for the Brain drawer's network view.
 * @property {number[]} outputs Post-tanh outputs: [throttle, steer], each in [-1, 1].
 */

/**
 * Run the network forward on one sensor reading.
 *
 * @param {NetworkWeights} weights
 * @param {number[]} inputs From sensors.js's SensorReading.inputs.
 * @returns {NetworkActivation}
 */
export function forward(weights, inputs) {
  const hidden = weights.w1.map((row, i) => {
    let sum = weights.b1[i];
    for (let j = 0; j < row.length; j++) sum += row[j] * inputs[j];
    return Math.tanh(sum);
  });
  const outputs = weights.w2.map((row, i) => {
    let sum = weights.b2[i];
    for (let j = 0; j < row.length; j++) sum += row[j] * hidden[j];
    return Math.tanh(sum);
  });
  return { inputs, hidden, outputs };
}

/** Outputs within this distance of 0 count as "hold" / "straight" rather than a firm accelerate/brake or left/right. */
const DEAD_ZONE = 1 / 3;

/**
 * Convert the network's two continuous outputs into one of the same
 * nine actions every other drawer already understands (BUILD.md 13).
 *
 * @param {number[]} outputs [throttle, steer], each in [-1, 1].
 * @returns {number} Action index, 0 to 8 (see actions.js).
 */
export function outputsToActionIndex(outputs) {
  const [throttle, steer] = outputs;
  const throttleIndex = throttle > DEAD_ZONE ? 0 : throttle < -DEAD_ZONE ? 2 : 1; // accelerate / brake / hold
  const steerIndex = steer < -DEAD_ZONE ? 0 : steer > DEAD_ZONE ? 2 : 1; // left / right / straight
  return throttleIndex * 3 + steerIndex;
}

/**
 * @typedef {Object} RoundResult
 * @property {number} distance Reward: metres of track covered.
 * @property {number} lapsDone Laps completed this round.
 * @property {boolean} finished Whether this round reached the lap target.
 */

/**
 * Work out this lineage's next state after one round (BUILD.md 13): a
 * (1+1) hill climber. The child this round's `weights` becomes the new
 * parent only if it travelled further than the current parent; a car
 * that has already finished keeps its lineage unchanged.
 *
 * @param {Lineage} lineage Lineage as it stood for the round that just ended.
 * @param {NetworkWeights} candidateWeights The (mutated) weights actually used this round.
 * @param {RoundResult} result What happened in that round.
 * @param {number} roundNumber The round number that just finished (1-based).
 * @returns {Lineage}
 */
export function selectNextRound(lineage, candidateWeights, result, roundNumber) {
  if (lineage.finished) return lineage;
  if (result.distance > lineage.bestDistance) {
    return {
      parent: candidateWeights,
      bestDistance: result.distance,
      lapsDone: result.lapsDone,
      finished: result.finished,
      bestRound: roundNumber,
    };
  }
  return lineage;
}
