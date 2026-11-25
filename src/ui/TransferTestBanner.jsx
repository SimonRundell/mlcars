/**
 * The Transfer test banner (BUILD.md 13): shown across the top of the
 * stage, under the toolbar, for the whole time a frozen test run is
 * active, so it is never mistaken for normal training. Non-modal, like
 * everything else in the app - the simulation keeps running behind it.
 *
 * @param {Object} props
 * @param {string} props.trackName
 * @param {() => void} props.onExit
 * @returns {JSX.Element}
 */
export function TransferTestBanner({ trackName, onExit }) {
  return (
    <div className="transfer-banner" role="status">
      <p className="transfer-banner__text">
        <strong>Transfer test:</strong> running the current network on {trackName}, learning switched off.
      </p>
      <button type="button" className="button button--secondary" onClick={onExit}>
        Exit test, back to training
      </button>
    </div>
  );
}
