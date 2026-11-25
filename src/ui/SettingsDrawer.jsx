import { useRef, useState } from 'react';
import { SETTINGS_RANGES } from '../constants.js';
import { randomSeed } from '../sim/rng.js';

const SHORTCUTS = [
  { keys: 'Space', action: 'Play or pause' },
  { keys: '.', action: 'Step one decision' },
  { keys: '1 to 6', action: 'Select that car' },
  { keys: 'R', action: 'Open the Round report' },
  { keys: 'Esc', action: 'Close the focused drawer' },
];

/**
 * The Settings drawer: the teacher-facing tuning table from BUILD.md
 * section 4.6, plus the keyboard shortcuts help list from section 11.
 *
 * @param {Object} props
 * @param {import('../sim/world.js').WorldSettings} props.settings
 * @param {number} props.seed
 * @param {(partial: Partial<import('../sim/world.js').WorldSettings>) => void} props.onUpdateSettings
 * @param {(seed: number) => void} props.onNewSeed
 * @param {() => void} props.onExport Trigger a save-file download.
 * @param {(text: string) => string|null} props.onImport Parses and applies the text of an imported save file; returns an error message, or null on success.
 * @param {'route'|'sensor'} props.mode Learning mode (BUILD.md 13).
 * @param {import('../tracks/index.js').TrackDef[]} props.tracks All tracks, for the Transfer test track picker.
 * @param {string} props.currentTrackId So the Transfer test picker can default to a different track.
 * @param {boolean} props.inTransferTest
 * @param {(testTrackId: string) => void} props.onStartTransferTest
 * @returns {JSX.Element}
 */
export function SettingsDrawer({
  settings,
  seed,
  onUpdateSettings,
  onNewSeed,
  onExport,
  onImport,
  mode,
  tracks,
  currentTrackId,
  inTransferTest,
  onStartTransferTest,
}) {
  const fileInputRef = useRef(null);
  const [importError, setImportError] = useState(null);

  const [testTrackId, setTestTrackId] = useState(tracks.find((t) => t.id !== currentTrackId)?.id ?? currentTrackId);

  function handleFileChosen(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    file.text().then((text) => {
      const error = onImport(text);
      setImportError(error);
    });
  }

  return (
    <div className="settings-drawer">
      <section className="settings-drawer__section">
        <h4>Seed</h4>
        <p className="settings-drawer__seed-value">
          Current seed: <code>{seed}</code>
        </p>
        <button type="button" className="button button--secondary" onClick={() => onNewSeed(randomSeed())}>
          New seed
        </button>
        <p className="settings-drawer__hint">Picking a new seed clears this track's learning, so the new randomness starts clean.</p>
      </section>

      <section className="settings-drawer__section">
        <h4>Learning</h4>
        <label className="field">
          <span>Lap target</span>
          <input
            type="range"
            min={SETTINGS_RANGES.lapTarget.min}
            max={SETTINGS_RANGES.lapTarget.max}
            step={SETTINGS_RANGES.lapTarget.step}
            value={settings.lapTarget}
            onChange={(e) => onUpdateSettings({ lapTarget: Number(e.target.value) })}
          />
          <output>{settings.lapTarget}</output>
        </label>

        {mode === 'route' ? (
          <>
            <label className="field">
              <span>Base rewind (steps)</span>
              <input
                type="range"
                min={SETTINGS_RANGES.baseRewind.min}
                max={SETTINGS_RANGES.baseRewind.max}
                step={SETTINGS_RANGES.baseRewind.step}
                value={settings.baseRewind}
                onChange={(e) => onUpdateSettings({ baseRewind: Number(e.target.value) })}
              />
              <output>{settings.baseRewind}</output>
            </label>

            <label className="field">
              <span>Patience (failures before rewinding further)</span>
              <input
                type="range"
                min={SETTINGS_RANGES.patience.min}
                max={SETTINGS_RANGES.patience.max}
                step={SETTINGS_RANGES.patience.step}
                value={settings.patience}
                onChange={(e) => onUpdateSettings({ patience: Number(e.target.value) })}
              />
              <output>{settings.patience}</output>
            </label>

            <label className="field">
              <span>Big rewind jump (steps back when stuck crashing in the same spot)</span>
              <input
                type="range"
                min={SETTINGS_RANGES.bigRewindJump.min}
                max={SETTINGS_RANGES.bigRewindJump.max}
                step={SETTINGS_RANGES.bigRewindJump.step}
                value={settings.bigRewindJump}
                onChange={(e) => onUpdateSettings({ bigRewindJump: Number(e.target.value) })}
              />
              <output>{settings.bigRewindJump}</output>
            </label>

            <label className="field">
              <span>Stickiness (repeat previous move)</span>
              <input
                type="range"
                min={SETTINGS_RANGES.stickiness.min}
                max={SETTINGS_RANGES.stickiness.max}
                step={SETTINGS_RANGES.stickiness.step}
                value={settings.stickiness}
                onChange={(e) => onUpdateSettings({ stickiness: Number(e.target.value) })}
              />
              <output>{Math.round(settings.stickiness * 100)}%</output>
            </label>

            <label className="field field--checkbox">
              <input
                type="checkbox"
                checked={settings.optimizeForSpeed}
                onChange={(e) => onUpdateSettings({ optimizeForSpeed: e.target.checked })}
              />
              <span>Optimize for speed once a lap is secure</span>
            </label>
            <p className="settings-drawer__hint">
              Once a car has completed a lap, a round that reaches the same distance in fewer steps becomes the
              new best too, even if it did not go any further.
            </p>
          </>
        ) : (
          <>
            <label className="field">
              <span>Mutation size (random nudge applied to the network each round)</span>
              <input
                type="range"
                min={SETTINGS_RANGES.mutationSigma.min}
                max={SETTINGS_RANGES.mutationSigma.max}
                step={SETTINGS_RANGES.mutationSigma.step}
                value={settings.mutationSigma}
                onChange={(e) => onUpdateSettings({ mutationSigma: Number(e.target.value) })}
              />
              <output>{settings.mutationSigma.toFixed(2)}</output>
            </label>
            <p className="settings-drawer__hint">
              Each round, a car tries its parent network's weights plus a random nudge of about this size. If it
              travels further, that becomes the new parent.
            </p>
          </>
        )}
      </section>

      {mode === 'sensor' && (
        <section className="settings-drawer__section">
          <h4>Transfer test</h4>
          <p className="settings-drawer__hint settings-drawer__hint--lead">
            Puts the current cars on a different track with learning switched off, so you can see how well what
            they learned carries over.
          </p>
          {inTransferTest ? (
            <p className="settings-drawer__hint">A transfer test is already running. Use the banner above the track to exit it.</p>
          ) : (
            <div className="settings-drawer__save-buttons">
              <label className="visually-hidden" htmlFor="transfer-test-track">
                Track for the transfer test
              </label>
              <select id="transfer-test-track" className="toolbar__track-picker" value={testTrackId} onChange={(e) => setTestTrackId(e.target.value)}>
                {tracks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <button type="button" className="button button--secondary" onClick={() => onStartTransferTest(testTrackId)}>
                Start transfer test
              </button>
            </div>
          )}
        </section>
      )}

      <section className="settings-drawer__section">
        <h4>Track rules</h4>
        <label className="field field--checkbox">
          <input
            type="checkbox"
            checked={settings.collisionsOn}
            onChange={(e) => onUpdateSettings({ collisionsOn: e.target.checked })}
          />
          <span>Car to car collisions</span>
        </label>
        {mode === 'route' && (
          <label className="field field--checkbox">
            <input
              type="checkbox"
              checked={settings.showLearnedLines}
              onChange={(e) => onUpdateSettings({ showLearnedLines: e.target.checked })}
            />
            <span>Show learned lines</span>
          </label>
        )}
        <label className="field field--checkbox">
          <input
            type="checkbox"
            checked={settings.showCrashMarks}
            onChange={(e) => onUpdateSettings({ showCrashMarks: e.target.checked })}
          />
          <span>Show crash marks</span>
        </label>
        <label className="field">
          <span>Pause between rounds (1x and 2x only)</span>
          <input
            type="range"
            min={SETTINGS_RANGES.roundPauseSeconds.min}
            max={SETTINGS_RANGES.roundPauseSeconds.max}
            step={SETTINGS_RANGES.roundPauseSeconds.step}
            value={settings.roundPauseSeconds}
            onChange={(e) => onUpdateSettings({ roundPauseSeconds: Number(e.target.value) })}
          />
          <output>{settings.roundPauseSeconds}s</output>
        </label>
      </section>

      <section className="settings-drawer__section">
        <h4>Save data</h4>
        <p className="settings-drawer__hint settings-drawer__hint--lead">
          Everything is saved to this browser automatically. Export a copy to move it to another computer, or
          import one back.
        </p>
        <div className="settings-drawer__save-buttons">
          <button type="button" className="button button--secondary" onClick={onExport}>
            Export save file
          </button>
          <button type="button" className="button button--secondary" onClick={() => fileInputRef.current?.click()}>
            Import save file
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            aria-label="Import save file"
            className="visually-hidden"
            onChange={handleFileChosen}
          />
        </div>
        {importError && <p className="settings-drawer__import-error">{importError}</p>}
      </section>

      <section className="settings-drawer__section">
        <h4>Keyboard shortcuts</h4>
        <dl className="shortcut-list">
          {SHORTCUTS.map((s) => (
            <div key={s.keys}>
              <dt>
                <kbd>{s.keys}</kbd>
              </dt>
              <dd>{s.action}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
