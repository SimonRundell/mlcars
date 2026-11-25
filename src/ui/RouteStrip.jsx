import { useRef } from 'react';
import { ACTIONS } from '../sim/actions.js';

const WINDOW_SIZE = 30; // tiles either side of the current step, per BUILD.md 3.3 ("about 60" total).

/**
 * One step tile: a short glyph for the action, styled by state. State
 * never depends on colour alone - locked/exploring/rewind/crashed are
 * also distinguished by border style and a glyph (BUILD.md 11).
 *
 * @param {Object} props
 * @param {number} props.step
 * @param {number} props.actionIndex
 * @param {'locked'|'rewind'|'exploring'|'crashed'} props.state
 * @param {boolean} props.isCurrent
 * @returns {JSX.Element}
 */
function StepTile({ step, actionIndex, state, isCurrent }) {
  const action = ACTIONS[actionIndex];
  const classes = ['route-strip__tile', `route-strip__tile--${state}`];
  if (isCurrent) classes.push('route-strip__tile--current');
  const stateLabel = { locked: 'learned', rewind: 'rewind point', exploring: 'new, exploring', crashed: 'crashed here' }[state];
  return (
    <div
      className={classes.join(' ')}
      title={`Step ${step}: ${action.label} (${stateLabel})`}
      aria-hidden="true"
    >
      <span className="route-strip__glyph">{glyphFor(action)}</span>
    </div>
  );
}

function glyphFor(action) {
  const throttleGlyph = { accelerate: '▲', hold: '●', brake: '▼' }[action.throttle];
  const steerGlyph = { left: '◀', straight: '│', right: '▶' }[action.steer];
  return `${throttleGlyph}${steerGlyph}`;
}

/**
 * The Brain drawer's route strip: a scrollable ribbon of step tiles
 * around the current step, with a compact whole-route bar underneath
 * (BUILD.md 3.3). Dragging the whole route bar scrolls the strip.
 *
 * @param {Object} props
 * @param {number[]} props.route Action indices taken so far this round.
 * @param {number} props.rewindStep
 * @param {number} props.currentStep
 * @param {number|null} [props.crashedStep]
 * @returns {JSX.Element}
 */
export function RouteStrip({ route, rewindStep, currentStep, crashedStep = null }) {
  const scrollRef = useRef(null);

  const windowStart = Math.max(0, currentStep - WINDOW_SIZE);
  const windowEnd = Math.min(route.length - 1, currentStep + WINDOW_SIZE);
  const tiles = [];
  for (let step = windowStart; step <= windowEnd; step++) {
    if (route[step] == null) continue;
    let state = step < rewindStep ? 'locked' : step === rewindStep ? 'rewind' : 'exploring';
    if (step === crashedStep) state = 'crashed';
    tiles.push({ step, actionIndex: route[step], state });
  }

  const total = Math.max(1, route.length);
  const lockedPct = (Math.min(rewindStep, route.length) / total) * 100;
  const crashedPct = crashedStep != null ? (1 / total) * 100 : 0;
  const newPct = Math.max(0, 100 - lockedPct - crashedPct);

  function handleBarPointerDown(e) {
    const bar = e.currentTarget;
    const seek = (clientX) => {
      const rect = bar.getBoundingClientRect();
      const fraction = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const targetStep = Math.round(fraction * (route.length - 1));
      const strip = scrollRef.current;
      if (!strip) return;
      const tileEl = strip.querySelector(`[data-step="${targetStep}"]`);
      if (tileEl) tileEl.scrollIntoView({ block: 'nearest', inline: 'center' });
    };
    seek(e.clientX);
    const onMove = (moveEvent) => seek(moveEvent.clientX);
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  return (
    <div className="route-strip">
      <div className="route-strip__scroller" ref={scrollRef} role="list" aria-label="Route steps, locked, new and exploring moves around the current step">
        {tiles.map((t) => (
          <div key={t.step} data-step={t.step} role="listitem">
            <StepTile step={t.step} actionIndex={t.actionIndex} state={t.state} isCurrent={t.step === currentStep} />
          </div>
        ))}
      </div>
      <div
        className="route-strip__whole-bar"
        onPointerDown={handleBarPointerDown}
        role="slider"
        tabIndex={0}
        aria-label="Whole route overview. Drag to scroll the step strip."
        aria-valuemin={0}
        aria-valuemax={route.length - 1}
        aria-valuenow={currentStep}
      >
        <span className="route-strip__whole-bar-segment route-strip__whole-bar-segment--locked" style={{ width: `${lockedPct}%` }} />
        <span className="route-strip__whole-bar-segment route-strip__whole-bar-segment--new" style={{ width: `${newPct}%` }} />
        {crashedStep != null && (
          <span className="route-strip__whole-bar-segment route-strip__whole-bar-segment--crashed" style={{ width: `${crashedPct}%` }} />
        )}
      </div>
    </div>
  );
}
