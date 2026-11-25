import { useCallback, useEffect, useRef, useState } from 'react';
import { getAction } from '../sim/actions.js';

const MAX_LINES = 200;
const FLUSH_INTERVAL_MS = 180; // keeps visible updates to "a few lines a second" (BUILD.md 3.3) even if events arrive faster.

const CAUSE_TEXT = {
  wall: 'hit the outside wall',
  wrongway: 'went the wrong way',
  timeup: 'ran out of time',
  finished: 'finished the lap target',
};

/** @param {string} cause @returns {string} */
function causeText(cause) {
  if (cause.startsWith('car:')) return `hit car ${cause.slice(4)}`;
  return CAUSE_TEXT[cause] ?? cause;
}

/**
 * Builds the plain-English running log (BUILD.md 3.3), the screen reader
 * equivalent of the canvas (section 11). Normal speeds get one line per
 * notable event; Turbo collapses everything down to one summary line per
 * round, per BUILD.md's explicit throttling rule. A small flush interval
 * caps how often the visible list updates even at 20x, where several
 * rounds can finish inside one real second.
 *
 * @param {Object} args
 * @param {import('../sim/world.js').World} args.world
 * @param {string} args.speedId Current playback speed id (see constants.js SPEED_OPTIONS).
 * @returns {{ lines: string[], muted: boolean, setMuted: (m: boolean) => void, verbose: boolean, setVerbose: (v: boolean) => void }}
 */
export function useCommentary({ world, speedId }) {
  const [lines, setLines] = useState([]);
  const [muted, setMuted] = useState(false);
  const [verbose, setVerbose] = useState(false);
  const bufferRef = useRef([]);
  const nextIdRef = useRef(0);
  const speedIdRef = useRef(speedId);
  const verboseRef = useRef(verbose);
  const lastConsoleLogAtRef = useRef(0);
  speedIdRef.current = speedId;
  verboseRef.current = verbose;

  const push = useCallback((text) => {
    bufferRef.current.push({ id: nextIdRef.current++, text });
  }, []);

  useEffect(() => {
    return world.subscribe((event) => {
      const isTurbo = speedIdRef.current === 'turbo';
      const isSensor = world.mode === 'sensor';

      if (event.type === 'carStopped') {
        if (isTurbo) return;
        const car = world.cars[event.payload.carIndex];
        const delta = event.payload.distance - car.lineage.bestDistance;
        const bestText = event.payload.isNewBest
          ? ` That is ${delta.toFixed(1)}m further than its best. New best.`
          : '';
        push(`Car ${car.identity.number} ${causeText(event.payload.cause)} at step ${event.payload.step}.${bestText}`);
      } else if (event.type === 'rewindPointReached') {
        if (isTurbo) return;
        const car = world.cars[event.payload.carIndex];
        const label = getAction(car.currentActionIndex).label;
        push(`Car ${car.identity.number} reached its rewind point at step ${event.payload.step} and tried ${label}.`);
      } else if (event.type === 'roundStarted') {
        if (isTurbo || isSensor || event.payload.roundNumber === 1) return;
        const parts = world.cars.map((car) => `Car ${car.identity.number} ${car.rewindStep} move${car.rewindStep === 1 ? '' : 's'}`);
        push(`Round ${event.payload.roundNumber} starts, replaying: ${parts.join(', ')}.`);
      } else if (event.type === 'roundEnded') {
        if (!isTurbo) {
          for (const r of event.payload.results) {
            const number = world.cars[r.carIndex].identity.number;
            if (isSensor) {
              if (r.mutationKept) push(`Car ${number} kept this round's mutated network - it travelled further.`);
            } else {
              if (r.efficiencyWin) {
                push(`Car ${number} found a faster way to the same distance: now ${world.lineages[r.carIndex].best.length} steps.`);
              }
              if (r.backtrackJump > 1) {
                push(`Car ${number} kept crashing in the same spot, so it is jumping back ${r.backtrackJump} steps instead of 1.`);
              }
            }
          }
        }
        const steps = Math.max(0, ...event.payload.results.map((r) => r.route.length));
        push(`All cars stopped. Round ${event.payload.roundNumber} lasted ${steps} steps.`);

        // Verbose mode (off by default): a raw line per car per round,
        // ignoring the Turbo throttle above, so a normal-sized backtrack
        // (rewind +1) is visible too, not just a same-spot big jump -
        // useful for checking the learning mechanics are doing what
        // they should, rather than for teaching.
        if (verboseRef.current) {
          const rows = event.payload.results.map((r) =>
            isSensor
              ? {
                  round: event.payload.roundNumber,
                  car: world.cars[r.carIndex].identity.number,
                  distance: Math.round(r.distance),
                  cause: r.cause,
                  bestDistance: Math.round(world.lineages[r.carIndex].bestDistance),
                  mutationKept: r.mutationKept,
                }
              : {
                  round: event.payload.roundNumber,
                  car: world.cars[r.carIndex].identity.number,
                  distance: Math.round(r.distance),
                  cause: r.cause,
                  rewind: world.lineages[r.carIndex].rewind,
                  bestSteps: world.lineages[r.carIndex].best.length,
                  backtrackJump: r.backtrackJump,
                  efficiencyWin: r.efficiencyWin,
                }
          );
          // Throttled separately from the push buffer below: at Turbo,
          // many rounds can finish per real second, and console.table
          // is not cheap - logging every single one would make the
          // console unusable rather than useful.
          const now = performance.now();
          if (now - lastConsoleLogAtRef.current >= 150) {
            lastConsoleLogAtRef.current = now;
            // eslint-disable-next-line no-console
            console.table(rows);
          }
          for (const row of rows) {
            const text = isSensor
              ? `Round ${row.round}, Car ${row.car}: ${row.distance}m (${row.cause}), parent best ${row.bestDistance}m.${row.mutationKept ? ' MUTATION KEPT' : ''}`
              : `Round ${row.round}, Car ${row.car}: ${row.distance}m (${row.cause}), rewind now ${row.rewind}, best ${row.bestSteps} steps.${row.backtrackJump > 1 ? ` BIG JUMP +${row.backtrackJump}` : row.backtrackJump === 1 ? ' +1' : ''}${row.efficiencyWin ? ' EFFICIENCY WIN' : ''}`;
            push(text);
          }
        }
      } else if (event.type === 'allFinished') {
        push(`All six cars have finished ${event.payload.lapTarget} laps. Raise the lap target in Settings to keep them learning.`);
      } else if (event.type === 'learningReset') {
        push('Learning has been reset. Starting fresh from round 1.');
      }
    });
  }, [world, push]);

  useEffect(() => {
    const id = setInterval(() => {
      if (bufferRef.current.length === 0) return;
      const newLines = bufferRef.current;
      bufferRef.current = [];
      setLines((prev) => [...newLines].reverse().concat(prev).slice(0, MAX_LINES));
    }, FLUSH_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return { lines, muted, setMuted, verbose, setVerbose };
}
