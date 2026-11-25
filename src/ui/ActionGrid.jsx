import { ACTIONS } from '../sim/actions.js';

/**
 * The nine-move action grid: rows are throttle (speed up, hold, slow
 * down), columns are steer (left, straight, right). Used both as the
 * Brain drawer's "current decision" display and, smaller, as the
 * "Tried here" mini grid. State never depends on colour alone: the
 * selected cell gets a thick border and a dot, tried-and-failed cells
 * get a cross shape (BUILD.md 3.3, section 11).
 *
 * @param {Object} props
 * @param {string} props.caption Accessible description of what this grid shows.
 * @param {number|null} [props.selectedIndex] Highlighted action, 0-8.
 * @param {number[]} [props.triedIndices] Actions to show crossed out.
 * @param {'normal'|'mini'} [props.size]
 * @returns {JSX.Element}
 */
export function ActionGrid({ caption, selectedIndex = null, triedIndices = [], size = 'normal' }) {
  return (
    <table className={`action-grid action-grid--${size}`}>
      <caption className="visually-hidden">{caption}</caption>
      <tbody>
        {[0, 1, 2].map((throttleIndex) => (
          <tr key={throttleIndex}>
            {[0, 1, 2].map((steerIndex) => {
              const action = ACTIONS[throttleIndex * 3 + steerIndex];
              const isSelected = selectedIndex === action.index;
              const isTried = triedIndices.includes(action.index);
              const classes = ['action-grid__cell'];
              if (isSelected) classes.push('action-grid__cell--selected');
              if (isTried) classes.push('action-grid__cell--tried');
              return (
                <td key={steerIndex}>
                  <div
                    className={classes.join(' ')}
                    role="img"
                    aria-label={`${action.label}${isSelected ? ', chosen' : ''}${isTried ? ', already tried here' : ''}`}
                  >
                    <span aria-hidden="true">{action.label}</span>
                    {isTried && <span className="action-grid__cross" aria-hidden="true" />}
                  </div>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
