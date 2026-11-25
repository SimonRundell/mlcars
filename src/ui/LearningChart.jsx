import { useId, useState } from 'react';
import { CARS } from '../constants.js';

/** Distinct stroke-dasharray per car, so lines never rely on colour alone to tell apart (BUILD.md 3.3). */
const DASH_PATTERNS = ['none', '9 5', '2 4', '11 3 2 3', '1 5', '15 4 3 4'];

const VIEW_WIDTH = 640;
const VIEW_HEIGHT = 340;
const MARGIN = { top: 16, right: 86, bottom: 32, left: 48 };
const MAX_POINTS_PER_CAR = 150;
const MAX_INTERACTIVE_POINTS_PER_CAR = 20;

/**
 * Evenly downsample a history array to at most `max` points, always
 * keeping the first and last point.
 *
 * @param {{round: number, bestDistance: number}[]} history
 * @param {number} max
 * @returns {{round: number, bestDistance: number}[]}
 */
function downsample(history, max) {
  if (history.length <= max) return history;
  const step = (history.length - 1) / (max - 1);
  const out = [];
  for (let i = 0; i < max; i++) out.push(history[Math.round(i * step)]);
  return out;
}

/**
 * The Learning chart drawer (BUILD.md 3.3): a hand-written SVG line
 * chart of best distance per round, one line per car, with a dotted
 * line at one lap and at the lap target. Hovering or focusing a point
 * gives a text readout, so the information never depends on colour or
 * on the mouse.
 *
 * @param {Object} props
 * @param {import('../sim/world.js').World} props.world
 * @param {Object} props.snapshot Throttled snapshot from useWorld (for settings.lapTarget).
 * @returns {JSX.Element}
 */
export function LearningChart({ world, snapshot }) {
  const titleId = useId();
  const [hover, setHover] = useState(null);

  const trackLength = world.track.length;
  const lapTarget = snapshot.settings.lapTarget;
  const perCar = CARS.map((identity) => downsample(world.history[identity.index], MAX_POINTS_PER_CAR));

  const maxRound = Math.max(1, ...perCar.map((h) => (h.length > 0 ? h[h.length - 1].round : 1)));
  const maxDistance = Math.max(trackLength * lapTarget, ...perCar.flatMap((h) => h.map((p) => p.bestDistance)), 1);

  const plotWidth = VIEW_WIDTH - MARGIN.left - MARGIN.right;
  const plotHeight = VIEW_HEIGHT - MARGIN.top - MARGIN.bottom;
  const xScale = (round) => MARGIN.left + (round / maxRound) * plotWidth;
  const yScale = (distance) => MARGIN.top + plotHeight - (distance / maxDistance) * plotHeight;

  const hasData = perCar.some((h) => h.length > 0);

  return (
    <div className="learning-chart">
      {!hasData ? (
        <p className="learning-chart__empty">No rounds finished yet. The chart fills in once a round ends.</p>
      ) : (
        <>
          <svg
            className="learning-chart__svg"
            viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
            role="img"
            aria-labelledby={titleId}
          >
            <title id={titleId}>Best distance per round, one line per car</title>

            <line x1={MARGIN.left} y1={MARGIN.top} x2={MARGIN.left} y2={VIEW_HEIGHT - MARGIN.bottom} className="learning-chart__axis" />
            <line
              x1={MARGIN.left}
              y1={VIEW_HEIGHT - MARGIN.bottom}
              x2={VIEW_WIDTH - MARGIN.right}
              y2={VIEW_HEIGHT - MARGIN.bottom}
              className="learning-chart__axis"
            />

            <line
              x1={MARGIN.left}
              y1={yScale(trackLength)}
              x2={VIEW_WIDTH - MARGIN.right}
              y2={yScale(trackLength)}
              className="learning-chart__guide"
            />
            <text x={VIEW_WIDTH - MARGIN.right + 4} y={yScale(trackLength) + 4} className="learning-chart__guide-label">
              1 lap
            </text>

            <line
              x1={MARGIN.left}
              y1={yScale(trackLength * lapTarget)}
              x2={VIEW_WIDTH - MARGIN.right}
              y2={yScale(trackLength * lapTarget)}
              className="learning-chart__guide learning-chart__guide--target"
            />
            <text
              x={VIEW_WIDTH - MARGIN.right + 4}
              y={yScale(trackLength * lapTarget) + 4}
              className="learning-chart__guide-label"
            >
              Target ({lapTarget} lap{lapTarget === 1 ? '' : 's'})
            </text>

            {CARS.map((identity) => {
              const points = perCar[identity.index];
              if (points.length === 0) return null;
              const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.round).toFixed(1)} ${yScale(p.bestDistance).toFixed(1)}`).join(' ');
              const last = points[points.length - 1];
              const interactivePoints = downsample(points, MAX_INTERACTIVE_POINTS_PER_CAR);
              return (
                <g key={identity.index}>
                  <path
                    d={d}
                    fill="none"
                    stroke={`var(${identity.colourVar})`}
                    strokeWidth="2.5"
                    strokeDasharray={DASH_PATTERNS[identity.index]}
                    className="learning-chart__line"
                  />
                  <text x={xScale(last.round) + 6} y={yScale(last.bestDistance) + 4} className="learning-chart__end-label">
                    {identity.name}
                  </text>
                  {interactivePoints.map((p) => (
                    <g key={p.round}>
                      {/* 44x44 touch/focus target (BUILD.md accessibility minimums), drawn behind the small visible dot. */}
                      <circle
                        cx={xScale(p.round)}
                        cy={yScale(p.bestDistance)}
                        r={22}
                        className="learning-chart__point-target"
                        tabIndex={0}
                        role="img"
                        aria-label={`${identity.name}, round ${p.round}, best distance ${p.bestDistance.toFixed(1)} metres`}
                        onMouseEnter={() => setHover({ name: identity.name, round: p.round, distance: p.bestDistance })}
                        onFocus={() => setHover({ name: identity.name, round: p.round, distance: p.bestDistance })}
                        onMouseLeave={() => setHover(null)}
                        onBlur={() => setHover(null)}
                      />
                      <circle cx={xScale(p.round)} cy={yScale(p.bestDistance)} r={4} className="learning-chart__point" />
                    </g>
                  ))}
                </g>
              );
            })}

            <text x={MARGIN.left} y={VIEW_HEIGHT - 6} className="learning-chart__axis-label">
              Round 0
            </text>
            <text x={VIEW_WIDTH - MARGIN.right} y={VIEW_HEIGHT - 6} className="learning-chart__axis-label" textAnchor="end">
              Round {maxRound}
            </text>
          </svg>

          <p className="learning-chart__readout" aria-live="polite">
            {hover ? `${hover.name}: round ${hover.round}, best distance ${hover.distance.toFixed(1)} metres.` : 'Hover or tab to a point for its round and distance.'}
          </p>
        </>
      )}
    </div>
  );
}
