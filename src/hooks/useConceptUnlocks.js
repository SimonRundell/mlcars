import { useCallback, useEffect, useRef, useState } from 'react';
import { CONCEPTS } from '../content/concepts.js';

/** Triggers considered true the moment the app opens (round 1 has already started by the time anything can subscribe). */
const IMMEDIATE_TRIGGERS = new Set(['appOpened', 'roundStarted']);

/**
 * Tracks which Concepts drawer cards have been "unlocked" by something
 * happening in the simulation (BUILD.md 3.3: a small non-blocking notice
 * appears the moment a concept first becomes relevant). Phase 3 concepts
 * (trigger 'phase3') unlock together the first time `mode` becomes
 * 'sensor'.
 *
 * @param {Object} args
 * @param {import('../sim/world.js').World} args.world
 * @param {string} args.trackId Current track id, to detect a track change ("it only works on this track").
 * @param {'route'|'sensor'} [args.mode] Learning mode (BUILD.md 13) - the first switch to 'sensor' unlocks concepts 13-15.
 * @returns {{
 *   unlockedIds: Set<string>,
 *   pendingNotice: import('../content/concepts.js').Concept|null,
 *   dismissNotice: () => void,
 * }}
 */
export function useConceptUnlocks({ world, trackId, mode }) {
  const [unlockedIds, setUnlockedIds] = useState(() => {
    const initial = new Set();
    for (const c of CONCEPTS) if (IMMEDIATE_TRIGGERS.has(c.trigger)) initial.add(c.id);
    return initial;
  });
  const [noticeQueue, setNoticeQueue] = useState([]);
  const firstTrackIdRef = useRef(trackId);
  const prevRewindByCarRef = useRef(null);

  const unlockByTriggers = useCallback((triggers) => {
    const newlyUnlocked = [];
    setUnlockedIds((prev) => {
      const next = new Set(prev);
      for (const c of CONCEPTS) {
        if (triggers.has(c.trigger) && !next.has(c.id)) {
          next.add(c.id);
          newlyUnlocked.push(c);
        }
      }
      return newlyUnlocked.length > 0 ? next : prev;
    });
    if (newlyUnlocked.length > 0) setNoticeQueue((q) => [...q, ...newlyUnlocked]);
  }, []);

  useEffect(() => {
    // A track switch swaps in a fresh World with its own lineages; drop the
    // cached rewind values so the first round on the new track is never
    // compared against the previous track's.
    prevRewindByCarRef.current = null;
  }, [world]);

  useEffect(() => {
    return world.subscribe((event) => {
      const triggers = new Set();

      if (event.type === 'carStopped') {
        triggers.add('carStopped');
        if (typeof event.payload.cause === 'string' && event.payload.cause.startsWith('car:')) {
          triggers.add('carCollision');
        }
      } else if (event.type === 'rewindPointReached') {
        triggers.add('rewindPointReached');
      } else if (event.type === 'learningReset') {
        triggers.add('learningReset');
      } else if (event.type === 'roundEnded') {
        triggers.add('roundEnded');
        if (event.payload.roundNumber >= 2) triggers.add('secondRound');
        if (event.payload.results.some((r) => r.lapsDone >= 1)) triggers.add('lapCompleted');

        const prevRewind = prevRewindByCarRef.current;
        if (prevRewind) {
          const backtracked = world.lineages.some((lineage, i) => lineage.rewind > (prevRewind[i] ?? lineage.rewind));
          if (backtracked) triggers.add('backtrack');
        }
        prevRewindByCarRef.current = world.lineages.map((l) => l.rewind);
      }

      if (triggers.size > 0) unlockByTriggers(triggers);
    });
  }, [world, unlockByTriggers]);

  useEffect(() => {
    if (trackId !== firstTrackIdRef.current) unlockByTriggers(new Set(['trackChanged']));
  }, [trackId, unlockByTriggers]);

  useEffect(() => {
    if (mode === 'sensor') unlockByTriggers(new Set(['phase3']));
  }, [mode, unlockByTriggers]);

  const dismissNotice = useCallback(() => {
    setNoticeQueue((q) => q.slice(1));
  }, []);

  return {
    unlockedIds,
    pendingNotice: noticeQueue[0] ?? null,
    dismissNotice,
  };
}
