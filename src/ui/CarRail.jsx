import { CARS } from '../constants.js';

/** @param {Object} car Snapshot entry for one car. @param {boolean} isSensor @returns {string} */
function oneWordStatus(car, isSensor) {
  if (!car.stopped) {
    if (isSensor) return 'Driving';
    return car.lastDecisionSource === 'locked' ? 'Learning' : 'Exploring';
  }
  if (car.stopCause === 'finished') return 'Finished';
  if (car.stopCause === 'timeup') return 'Time up';
  if (car.stopCause === 'wrongway') return 'Wrong way';
  return 'Crashed';
}

/**
 * The rail of six car chips (BUILD.md 3.1). A vertical rail at desktop
 * widths, a horizontally scrolling row at 375px (handled by CSS, not
 * this component). Selecting a car works from these chips and by
 * keyboard - the canvas itself is never a click target for selection.
 *
 * @param {Object} props
 * @param {Object} props.snapshot World.snapshot() result.
 * @param {number} props.selectedCarIndex
 * @param {(index: number) => void} props.onSelectCar
 * @param {boolean} [props.isSensor]
 * @returns {JSX.Element}
 */
export function CarRail({ snapshot, selectedCarIndex, onSelectCar, isSensor }) {
  return (
    <div className="car-rail" role="group" aria-label="Select a car">
      {CARS.map((identity, i) => {
        const car = snapshot.cars[i];
        const isSelected = i === selectedCarIndex;
        return (
          <button
            key={identity.index}
            type="button"
            className={`car-chip${isSelected ? ' car-chip--selected' : ''}`}
            aria-pressed={isSelected}
            onClick={() => onSelectCar(i)}
          >
            <span
              className={`car-swatch car-swatch--pattern-${identity.pattern}`}
              style={{ '--swatch-colour': `var(${identity.colourVar})`, '--swatch-ink': `var(${identity.inkVar})` }}
              aria-hidden="true"
            />
            <span className="car-chip__text">
              <span className="car-chip__name">
                {identity.number}. {identity.name}
              </span>
              <span className="car-chip__status">{oneWordStatus(car, isSensor)}</span>
              <span className="car-chip__best">{Math.round(car.bestDistance)} m best</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
