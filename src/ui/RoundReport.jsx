import { CARS } from '../constants.js';

/** Plain-English stop cause for the Round report table. @param {string} cause @returns {string} */
function causeText(cause) {
  if (cause === 'wall') return 'Hit the wall';
  if (cause === 'wrongway') return 'Wrong way';
  if (cause === 'timeup') return 'Time up';
  if (cause === 'finished') return 'Finished';
  if (cause?.startsWith('car:')) return `Hit car ${cause.split(':')[1]}`;
  return cause ?? 'Still going';
}

/**
 * The Round report drawer: a table of what each car did last round, and
 * the plan for its next one (BUILD.md 3.3 - "the single most important
 * teaching view, because it shows the learning decision explicitly").
 *
 * @param {Object} props
 * @param {{roundNumber: number, rows: Object[]}|null} props.report
 * @returns {JSX.Element}
 */
export function RoundReport({ report }) {
  if (!report) {
    return (
      <div className="round-report">
        <p>No round has finished yet. The first report appears once every car has stopped.</p>
      </div>
    );
  }

  return (
    <div className="round-report">
      <p className="round-report__round">Round {report.roundNumber}</p>
      <table className="round-report__table">
        <thead>
          <tr>
            <th scope="col">Car</th>
            <th scope="col">Distance</th>
            <th scope="col">How it stopped</th>
            <th scope="col">New best or faster?</th>
            <th scope="col">Plan for next round</th>
          </tr>
        </thead>
        <tbody>
          {report.rows.map((row) => {
            const identity = CARS[row.carIndex];
            return (
              <tr key={row.carIndex}>
                <th scope="row">
                  {identity.number}. {identity.name}
                </th>
                <td>{Math.round(row.distance)} m</td>
                <td>{causeText(row.cause)}</td>
                <td>{row.isNewBest ? 'Yes, further' : row.isEfficiencyWin ? 'Yes, faster' : 'No'}</td>
                <td>{row.plan}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
