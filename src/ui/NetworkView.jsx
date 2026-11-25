import { SENSOR_RAY_ANGLES_DEG } from '../constants.js';

const INPUT_LABELS = [...SENSOR_RAY_ANGLES_DEG.map((deg) => `${deg}°`), 'Speed', 'Nearest car'];
const OUTPUT_LABELS = ['Throttle', 'Steer'];

const VIEW_WIDTH = 440;
const VIEW_HEIGHT = 400;
const COLUMN_X = { input: 70, hidden: 230, output: 390 };
const NODE_RADIUS = 10;
const MARGIN_Y = 20;

/** @param {number} count @param {number} availableHeight @returns {number[]} Evenly spaced y positions. */
function layoutY(count, availableHeight) {
  const step = availableHeight / (count + 1);
  return Array.from({ length: count }, (_, i) => MARGIN_Y + step * (i + 1));
}

/** Clamp a weight's magnitude to a sensible stroke width, so one outsized weight cannot swamp the picture. @param {number} w @returns {number} */
function weightStrokeWidth(w) {
  return Math.max(0.4, Math.min(4, 0.4 + Math.abs(w) * 1.8));
}

/**
 * The Brain drawer's live network view for sensor cars (BUILD.md 13):
 * sensor values, nodes lit by their current activation, and connection
 * lines drawn thicker for larger weights. Numbers are shown everywhere
 * a value matters - this is a picture and a set of numbers, nothing is
 * ever described as the network "thinking" (see the About drawer and
 * the "Sensors and neural networks" concept card).
 *
 * @param {Object} props
 * @param {import('../sim/sensors.js').SensorReading} props.reading
 * @param {import('../sim/neuralBrain.js').NetworkActivation} props.activation
 * @param {import('../sim/neuralBrain.js').NetworkWeights} props.weights
 * @returns {JSX.Element}
 */
export function NetworkView({ reading, activation, weights }) {
  if (!reading || !activation) {
    return <p className="network-view__empty">Waiting for the first decision this round.</p>;
  }

  const inputValues = activation.inputs;
  const inputY = layoutY(inputValues.length, VIEW_HEIGHT - MARGIN_Y * 2);
  const hiddenY = layoutY(activation.hidden.length, VIEW_HEIGHT - MARGIN_Y * 2);
  const outputY = layoutY(activation.outputs.length, VIEW_HEIGHT - MARGIN_Y * 2);

  return (
    <div className="network-view">
      <svg className="network-view__svg" viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} role="img" aria-label="Live network: sensor inputs, hidden nodes and outputs">
        {weights.w1.map((row, h) =>
          row.map((w, i) => (
            <line
              key={`l1-${h}-${i}`}
              x1={COLUMN_X.input}
              y1={inputY[i]}
              x2={COLUMN_X.hidden}
              y2={hiddenY[h]}
              className="network-view__weight"
              strokeWidth={weightStrokeWidth(w)}
            />
          ))
        )}
        {weights.w2.map((row, o) =>
          row.map((w, h) => (
            <line
              key={`l2-${o}-${h}`}
              x1={COLUMN_X.hidden}
              y1={hiddenY[h]}
              x2={COLUMN_X.output}
              y2={outputY[o]}
              className="network-view__weight"
              strokeWidth={weightStrokeWidth(w)}
            />
          ))
        )}

        {inputValues.map((value, i) => (
          <g key={`in-${i}`}>
            <circle cx={COLUMN_X.input} cy={inputY[i]} r={NODE_RADIUS} className="network-view__node network-view__node--input" style={{ '--activation': value }} />
            <text x={COLUMN_X.input - NODE_RADIUS - 6} y={inputY[i] + 4} textAnchor="end" className="network-view__label">
              {INPUT_LABELS[i]}
            </text>
            <text x={COLUMN_X.input} y={inputY[i] + 4} textAnchor="middle" className="network-view__value">
              {value.toFixed(2)}
            </text>
          </g>
        ))}

        {activation.hidden.map((value, h) => (
          <circle
            key={`hid-${h}`}
            cx={COLUMN_X.hidden}
            cy={hiddenY[h]}
            r={NODE_RADIUS}
            className={`network-view__node${value >= 0 ? ' network-view__node--positive' : ' network-view__node--negative'}`}
            style={{ '--activation': Math.abs(value) }}
          />
        ))}

        {activation.outputs.map((value, o) => (
          <g key={`out-${o}`}>
            <circle
              cx={COLUMN_X.output}
              cy={outputY[o]}
              r={NODE_RADIUS}
              className={`network-view__node${value >= 0 ? ' network-view__node--positive' : ' network-view__node--negative'}`}
              style={{ '--activation': Math.abs(value) }}
            />
            <text x={COLUMN_X.output + NODE_RADIUS + 6} y={outputY[o] - 6} className="network-view__label">
              {OUTPUT_LABELS[o]}
            </text>
            <text x={COLUMN_X.output + NODE_RADIUS + 6} y={outputY[o] + 10} className="network-view__value">
              {value.toFixed(2)}
            </text>
          </g>
        ))}
      </svg>
      <p className="network-view__caption">
        Lines are the network's weights - thicker means a stronger connection. Nodes are lit by how strongly they
        are firing right now.
      </p>
    </div>
  );
}
