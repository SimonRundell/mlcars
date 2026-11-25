/**
 * The Commentary drawer (BUILD.md 3.3): a running log in plain English,
 * newest at the top. Doubles as the screen reader equivalent of the
 * canvas (section 11) via its aria-live region, which the mute toggle
 * switches off without hiding the visible list.
 *
 * @param {Object} props
 * @param {{id: number, text: string}[]} props.lines Newest first.
 * @param {boolean} props.muted
 * @param {(muted: boolean) => void} props.onSetMuted
 * @param {boolean} props.verbose Off by default. Adds a raw per-car-per-round line (distance, cause, rewind, any backtrack jump) ignoring the usual Turbo throttle, and mirrors the same rows to the browser console - a debugging aid, not teaching content, for checking the learning mechanics are doing what they should.
 * @param {(verbose: boolean) => void} props.onSetVerbose
 * @returns {JSX.Element}
 */
export function Commentary({ lines, muted, onSetMuted, verbose, onSetVerbose }) {
  return (
    <div className="commentary">
      <label className="field field--checkbox field--compact commentary__mute">
        <input type="checkbox" checked={muted} onChange={(e) => onSetMuted(e.target.checked)} />
        <span>Silence screen reader announcements</span>
      </label>

      <label className="field field--checkbox field--compact commentary__mute">
        <input type="checkbox" checked={verbose} onChange={(e) => onSetVerbose(e.target.checked)} />
        <span>Verbose: log every car, every round (also to the browser console)</span>
      </label>

      <ol className="commentary__list" aria-live={muted ? 'off' : 'polite'}>
        {lines.length === 0 && <li className="commentary__empty">Nothing has happened yet. Press play to start round 1.</li>}
        {lines.map((line) => (
          <li key={line.id}>{line.text}</li>
        ))}
      </ol>
    </div>
  );
}
