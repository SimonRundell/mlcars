import { useState } from 'react';
import { SPEED_OPTIONS } from '../constants.js';
import {
  IconAbout,
  IconBrain,
  IconChart,
  IconCommentary,
  IconConcepts,
  IconPause,
  IconPlay,
  IconReport,
  IconReset,
  IconRestart,
  IconSettings,
  IconStep,
} from './icons.jsx';

/**
 * The main toolbar (BUILD.md 3.2): playback controls, speed, the three
 * pause switches, a track picker, restart/reset, and the drawer-opening
 * buttons.
 *
 * @param {Object} props
 * @param {boolean} props.playing
 * @param {() => void} props.onTogglePlay
 * @param {() => void} props.onStep
 * @param {string} props.speedId
 * @param {(id: string) => void} props.onSetSpeed
 * @param {import('../hooks/useWorld.js').PauseSwitches} props.pauseSwitches
 * @param {(partial: Object) => void} props.onSetPauseSwitches
 * @param {() => void} props.onRestartRound
 * @param {() => void} props.onResetLearning
 * @param {import('../tracks/index.js').TrackDef[]} props.tracks All tracks, for the picker.
 * @param {string} props.trackId Current track id.
 * @param {(id: string) => void} props.onSelectTrack
 * @param {'route'|'sensor'} props.mode Learning mode (BUILD.md 13).
 * @param {(mode: 'route'|'sensor') => void} props.onSelectMode
 * @param {boolean} [props.modeDisabled] True during a Transfer test, when switching mode or track makes no sense until it's exited.
 * @param {string|null} props.openDrawer
 * @param {(name: string) => void} props.onToggleDrawer
 * @param {Object<string, import('react').RefObject<HTMLButtonElement>>} props.drawerButtonRefs
 * @returns {JSX.Element}
 */
export function Toolbar({
  playing,
  onTogglePlay,
  onStep,
  speedId,
  onSetSpeed,
  pauseSwitches,
  onSetPauseSwitches,
  onRestartRound,
  onResetLearning,
  tracks,
  trackId,
  onSelectTrack,
  mode,
  onSelectMode,
  modeDisabled,
  openDrawer,
  onToggleDrawer,
  drawerButtonRefs,
}) {
  const [confirmingReset, setConfirmingReset] = useState(false);

  function handleResetClick() {
    if (!confirmingReset) {
      setConfirmingReset(true);
      return;
    }
    setConfirmingReset(false);
    onResetLearning();
  }

  return (
    <div className="toolbar">
      <div className="toolbar__group">
        <button type="button" className="button button--icon" onClick={onTogglePlay} aria-pressed={playing} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? <IconPause /> : <IconPlay />}
          <span className="button__label">{playing ? 'Pause' : 'Play'}</span>
        </button>
        <button type="button" className="button button--icon" onClick={onStep} disabled={playing} aria-label="Step">
          <IconStep />
          <span className="button__label">Step</span>
        </button>
      </div>

      <div className="toolbar__group" role="group" aria-label="Playback speed">
        {SPEED_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`button button--chip${speedId === option.id ? ' button--chip-selected' : ''}`}
            aria-pressed={speedId === option.id}
            onClick={() => onSetSpeed(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="toolbar__group toolbar__group--switches" role="group" aria-label="Pause switches">
        <label className="field field--checkbox field--compact">
          <input
            type="checkbox"
            checked={pauseSwitches.onNewChoice}
            onChange={(e) => onSetPauseSwitches({ onNewChoice: e.target.checked })}
          />
          <span>Pause at next new choice</span>
        </label>
        <label className="field field--checkbox field--compact">
          <input type="checkbox" checked={pauseSwitches.onCrash} onChange={(e) => onSetPauseSwitches({ onCrash: e.target.checked })} />
          <span>Pause on any crash</span>
        </label>
        <label className="field field--checkbox field--compact">
          <input
            type="checkbox"
            checked={pauseSwitches.onRoundEnd}
            onChange={(e) => onSetPauseSwitches({ onRoundEnd: e.target.checked })}
          />
          <span>Pause at end of round</span>
        </label>
      </div>

      <div className="toolbar__group" role="group" aria-label="Learning mode">
        <button
          type="button"
          className={`button button--chip${mode === 'route' ? ' button--chip-selected' : ''}`}
          aria-pressed={mode === 'route'}
          disabled={modeDisabled}
          onClick={() => onSelectMode('route')}
        >
          Route cars
        </button>
        <button
          type="button"
          className={`button button--chip${mode === 'sensor' ? ' button--chip-selected' : ''}`}
          aria-pressed={mode === 'sensor'}
          disabled={modeDisabled}
          onClick={() => onSelectMode('sensor')}
        >
          Sensor cars
        </button>
      </div>

      <div className="toolbar__group">
        <label className="toolbar__track-picker-label">
          <span className="visually-hidden">Track</span>
          <select className="toolbar__track-picker" value={trackId} disabled={modeDisabled} onChange={(e) => onSelectTrack(e.target.value)}>
            {tracks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="button button--icon" onClick={onRestartRound} aria-label="Restart round">
          <IconRestart />
          <span className="button__label">Restart round</span>
        </button>
        <button
          type="button"
          className={`button button--icon button--danger${confirmingReset ? ' button--danger-confirming' : ''}`}
          onClick={handleResetClick}
          onBlur={() => setConfirmingReset(false)}
          aria-label={confirmingReset ? 'Click again to confirm resetting learning' : 'Reset learning'}
        >
          <IconReset />
          <span className="button__label">{confirmingReset ? 'Click again to confirm' : 'Reset learning'}</span>
        </button>
      </div>

      <div className="toolbar__group" role="group" aria-label="Drawers">
        <button
          type="button"
          ref={drawerButtonRefs.brain}
          className={`button button--icon${openDrawer === 'brain' ? ' button--chip-selected' : ''}`}
          aria-pressed={openDrawer === 'brain'}
          aria-label="Brain"
          onClick={() => onToggleDrawer('brain')}
        >
          <IconBrain />
          <span className="button__label">Brain</span>
        </button>
        <button
          type="button"
          ref={drawerButtonRefs.roundReport}
          className={`button button--icon${openDrawer === 'roundReport' ? ' button--chip-selected' : ''}`}
          aria-pressed={openDrawer === 'roundReport'}
          aria-label="Round report"
          onClick={() => onToggleDrawer('roundReport')}
        >
          <IconReport />
          <span className="button__label">Round report</span>
        </button>
        <button
          type="button"
          ref={drawerButtonRefs.learningChart}
          className={`button button--icon${openDrawer === 'learningChart' ? ' button--chip-selected' : ''}`}
          aria-pressed={openDrawer === 'learningChart'}
          aria-label="Learning chart"
          onClick={() => onToggleDrawer('learningChart')}
        >
          <IconChart />
          <span className="button__label">Learning chart</span>
        </button>
        <button
          type="button"
          ref={drawerButtonRefs.commentary}
          className={`button button--icon${openDrawer === 'commentary' ? ' button--chip-selected' : ''}`}
          aria-pressed={openDrawer === 'commentary'}
          aria-label="Commentary"
          onClick={() => onToggleDrawer('commentary')}
        >
          <IconCommentary />
          <span className="button__label">Commentary</span>
        </button>
        <button
          type="button"
          ref={drawerButtonRefs.concepts}
          className={`button button--icon${openDrawer === 'concepts' ? ' button--chip-selected' : ''}`}
          aria-pressed={openDrawer === 'concepts'}
          aria-label="Concepts"
          onClick={() => onToggleDrawer('concepts')}
        >
          <IconConcepts />
          <span className="button__label">Concepts</span>
        </button>
        <button
          type="button"
          ref={drawerButtonRefs.settings}
          className={`button button--icon${openDrawer === 'settings' ? ' button--chip-selected' : ''}`}
          aria-pressed={openDrawer === 'settings'}
          aria-label="Settings"
          onClick={() => onToggleDrawer('settings')}
        >
          <IconSettings />
          <span className="button__label">Settings</span>
        </button>
        <button
          type="button"
          ref={drawerButtonRefs.about}
          className={`button button--icon${openDrawer === 'about' ? ' button--chip-selected' : ''}`}
          aria-pressed={openDrawer === 'about'}
          aria-label="About"
          onClick={() => onToggleDrawer('about')}
        >
          <IconAbout />
          <span className="button__label">About</span>
        </button>
      </div>

      <img src="/favicon.png" alt="" className="toolbar__logo" />
    </div>
  );
}
