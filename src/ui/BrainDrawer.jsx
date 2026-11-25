import { CARS } from '../constants.js';
import { ACTIONS } from '../sim/actions.js';
import { ActionGrid } from './ActionGrid.jsx';
import { RouteStrip } from './RouteStrip.jsx';
import { NetworkView } from './NetworkView.jsx';

/**
 * Plain-English status badge text for a car (BUILD.md 3.3).
 *
 * @param {Object} car Snapshot entry for one car.
 * @param {number} lapTarget
 * @param {boolean} isSensor
 * @returns {string}
 */
function statusBadgeText(car, lapTarget, isSensor) {
  if (!car.stopped) {
    if (isSensor) return 'Reacting to its sensors';
    return car.lastDecisionSource === 'locked' ? 'Replaying learned moves' : 'Trying something new';
  }
  if (car.stopCause === 'wall') return 'Crashed: hit the wall';
  if (car.stopCause === 'wrongway') return 'Crashed: went the wrong way';
  if (car.stopCause === 'timeup') return 'Time up';
  if (car.stopCause === 'finished') return `Finished ${lapTarget} laps`;
  if (car.stopCause?.startsWith('car:')) return `Crashed: hit car ${car.stopCause.split(':')[1]}`;
  return 'Waiting';
}

/**
 * The reason line under the current decision card (BUILD.md 3.3).
 *
 * @param {Object} car
 * @param {Object} liveCar The world's live runtime car object (for lineage.best lookups).
 * @returns {string}
 */
function reasonText(car, liveCar) {
  if (car.lastDecisionSource === 'locked') {
    return `Remembered from round ${car.bestRound}`;
  }
  if (car.lastDecisionSource === 'new') {
    const previous = liveCar.lineage.best[car.rewindStep];
    if (previous != null) {
      return `New choice. ${ACTIONS[previous].label} already failed here`;
    }
    return 'New choice at the start of the route';
  }
  if (car.lastDecisionSource === 'explore') {
    return 'Random choice after the rewind point';
  }
  return '';
}

/**
 * The Brain drawer: the teaching heart of the app for one car (BUILD.md
 * 3.3). Reads the throttled snapshot for reactive values, plus the
 * live World object directly for the route array and lineage.best,
 * which are not worth including in the throttled snapshot.
 *
 * @param {Object} props
 * @param {number} props.carIndex
 * @param {Object} props.snapshot World.snapshot() result.
 * @param {import('../sim/world.js').World} props.world
 * @returns {JSX.Element}
 */
export function BrainDrawer({ carIndex, snapshot, world }) {
  const identity = CARS[carIndex];
  const car = snapshot.cars[carIndex];
  const liveCar = world.cars[carIndex];
  const isSensor = world.mode === 'sensor';

  return (
    <div className="brain-drawer">
      <header className="brain-drawer__header">
        <span
          className={`car-swatch car-swatch--pattern-${identity.pattern}`}
          style={{ '--swatch-colour': `var(${identity.colourVar})`, '--swatch-ink': `var(${identity.inkVar})` }}
          aria-hidden="true"
        />
        <div>
          <h3 className="brain-drawer__name">
            {identity.number}. {identity.name}
          </h3>
          <p className="status-badge">{statusBadgeText(car, snapshot.settings.lapTarget, isSensor)}</p>
        </div>
      </header>

      {isSensor ? (
        <>
          <section className="brain-drawer__section" aria-label="Current decision">
            <h4>Current decision</h4>
            <ActionGrid caption={`Car ${identity.number}'s current move`} selectedIndex={car.currentActionIndex} />
          </section>

          <section className="brain-drawer__section" aria-label="Network">
            <h4>Network</h4>
            <NetworkView reading={car.sensorReading} activation={car.activation} weights={liveCar.candidateWeights} />
          </section>

          <section className="brain-drawer__section brain-drawer__stats" aria-label="Stats">
            <h4>Stats</h4>
            <dl className="stat-list">
              <div>
                <dt>Round</dt>
                <dd>{snapshot.roundNumber}</dd>
              </div>
              <div>
                <dt>Distance this round</dt>
                <dd>{Math.round(car.distance)} m</dd>
              </div>
              <div>
                <dt>Best distance (parent)</dt>
                <dd>{Math.round(car.bestDistance)} m</dd>
              </div>
              <div>
                <dt>Laps</dt>
                <dd>{car.lapsDone}</dd>
              </div>
              <div>
                <dt>Mutation size</dt>
                <dd>{snapshot.settings.mutationSigma.toFixed(2)}</dd>
              </div>
            </dl>
          </section>
        </>
      ) : (
        <RouteBrainSections identity={identity} car={car} liveCar={liveCar} snapshot={snapshot} />
      )}
    </div>
  );
}

/**
 * The Phase 1-2 route-learning view: current decision, route strip,
 * tried-here grid and rewind stats (BUILD.md 3.3). Split out from
 * BrainDrawer so the sensor-mode branch above stays easy to read.
 *
 * @param {Object} props
 * @param {import('../constants.js').CarIdentity} props.identity
 * @param {Object} props.car Snapshot entry for this car.
 * @param {Object} props.liveCar The world's live runtime car object.
 * @param {Object} props.snapshot
 * @returns {JSX.Element}
 */
function RouteBrainSections({ identity, car, liveCar, snapshot }) {
  const route = liveCar.route;
  const currentStep = Math.max(0, route.length - 1);
  const crashedStep = car.stopped && car.stopCause !== 'timeup' && car.stopCause !== 'finished' ? route.length - 1 : null;
  const triedHere = liveCar.lineage.tried[car.rewindStep] || [];

  return (
    <>
      <section className="brain-drawer__section" aria-label="Current decision">
        <h4>Current decision</h4>
        <p className="brain-drawer__step-label">Step {currentStep}</p>
        <ActionGrid caption={`Car ${identity.number}'s current move`} selectedIndex={car.currentActionIndex} />
        <p className="brain-drawer__reason">{reasonText(car, liveCar)}</p>
      </section>

      <section className="brain-drawer__section" aria-label="Route so far">
        <h4>Route so far</h4>
        <RouteStrip route={route} rewindStep={car.rewindStep} currentStep={currentStep} crashedStep={crashedStep} />
      </section>

      <section className="brain-drawer__section" aria-label="Tried here">
        <h4>Tried here</h4>
        <ActionGrid caption="Moves already tried at this rewind point" triedIndices={triedHere} size="mini" />
      </section>

      <section className="brain-drawer__section brain-drawer__stats" aria-label="Stats">
        <h4>Stats</h4>
        <dl className="stat-list">
          <div>
            <dt>Round</dt>
            <dd>{snapshot.roundNumber}</dd>
          </div>
          <div>
            <dt>Distance this round</dt>
            <dd>{Math.round(car.distance)} m</dd>
          </div>
          <div>
            <dt>Best distance</dt>
            <dd>{Math.round(car.bestDistance)} m</dd>
          </div>
          <div>
            <dt>Laps</dt>
            <dd>{car.lapsDone}</dd>
          </div>
          <div>
            <dt>Rewind distance</dt>
            <dd>
              {car.rewind} step{car.rewind === 1 ? '' : 's'}
            </dd>
          </div>
          <div>
            <dt>Failures at this rewind point</dt>
            <dd>
              {car.failures} of {snapshot.settings.patience} before rewinding further
            </dd>
          </div>
        </dl>
      </section>
    </>
  );
}
