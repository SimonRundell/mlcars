import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CMFloatAd from './cmFloatAd.jsx';
import { DEFAULT_TRACK_ID, TRACKS, getTrackById } from './tracks/index.js';
import { DEFAULT_MODE } from './constants.js';
import { defaultSettings } from './sim/world.js';
import { randomSeed } from './sim/rng.js';
import { buildSaveFile, exportSaveFile, importSaveFile, loadSave, writeSave } from './sim/persistence.js';
import { useWorld } from './hooks/useWorld.js';
import { useReducedMotion } from './hooks/useReducedMotion.js';
import { useCommentary } from './hooks/useCommentary.js';
import { useConceptUnlocks } from './hooks/useConceptUnlocks.js';
import { Toolbar } from './ui/Toolbar.jsx';
import { CarRail } from './ui/CarRail.jsx';
import { TrackCanvas } from './ui/TrackCanvas.jsx';
import { Drawer } from './ui/Drawer.jsx';
import { BrainDrawer } from './ui/BrainDrawer.jsx';
import { RoundReport } from './ui/RoundReport.jsx';
import { SettingsDrawer } from './ui/SettingsDrawer.jsx';
import { LearningChart } from './ui/LearningChart.jsx';
import { Commentary } from './ui/Commentary.jsx';
import { ConceptsDrawer } from './ui/ConceptsDrawer.jsx';
import { AboutDrawer } from './ui/AboutDrawer.jsx';
import { ConceptUnlockedNotice } from './ui/ConceptUnlockedNotice.jsx';
import { TransferTestBanner } from './ui/TransferTestBanner.jsx';

/** Load whatever was saved last time for one track and mode, outside React state. @param {string} trackId @param {'route'|'sensor'} mode @returns {{seed: number, saved: Object|undefined}} */
function loadTrackSession(trackId, mode) {
  const save = loadSave();
  const trackSave = save?.tracks?.[trackId]?.[mode];
  return { seed: trackSave?.seed ?? randomSeed(), saved: trackSave };
}

/**
 * Build the canvas's refreshed-every-two-seconds aria-label summary
 * (BUILD.md section 11): everything the picture shows, also in text.
 *
 * @param {Object} snapshot
 * @returns {string}
 */
function buildAriaSummary(snapshot) {
  const leader = snapshot.cars.reduce((best, c) => (c.distance > best.distance ? c : best), snapshot.cars[0]);
  const stoppedCount = snapshot.cars.filter((c) => c.stopped).length;
  const stoppedPart = stoppedCount > 0 ? ` ${stoppedCount} car${stoppedCount === 1 ? '' : 's'} stopped.` : '';
  return `Round ${snapshot.roundNumber}. Car ${leader.index + 1} leads at ${Math.round(leader.distance)} metres.${stoppedPart}`;
}

/** Trigger a browser download of a text file. @param {string} filename @param {string} text */
function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * MLCars root application. Owns persistence, the selected track/car/
 * drawer, and the Concepts-unlock/Commentary side systems; the
 * simulation itself lives in the useWorld hook.
 *
 * @returns {JSX.Element}
 */
function App() {
  const reducedMotion = useReducedMotion();
  const initialRef = useRef(null);
  if (initialRef.current === null) {
    initialRef.current = { settings: loadSave()?.settings ?? defaultSettings() };
  }
  const initial = initialRef.current;

  const [trackId, setTrackId] = useState(DEFAULT_TRACK_ID);
  const [mode, setMode] = useState(DEFAULT_MODE);
  // Transfer test (BUILD.md 13): a temporary, non-persisted run on a
  // different track with the current sensor-mode weights frozen. Treated
  // like a third, ephemeral "track session" layered on top of the normal
  // trackId/mode state, which is left untouched underneath it.
  const [transferTest, setTransferTest] = useState(null); // null | { testTrackId, seed, frozenLineages }
  const inTransferTest = transferTest !== null;

  const activeTrackId = inTransferTest ? transferTest.testTrackId : trackId;
  const activeMode = inTransferTest ? 'sensor' : mode;
  const trackDef = getTrackById(activeTrackId);
  const learningEnabled = !inTransferTest;
  const sessionKey = inTransferTest ? `transfer:${transferTest.testTrackId}` : `${activeTrackId}:${activeMode}`;
  const settingsRef = useRef(initial.settings);

  const trackSession = useMemo(() => {
    if (inTransferTest) {
      return {
        seed: transferTest.seed,
        saved: {
          seed: transferTest.seed,
          roundNumber: 1,
          lineages: transferTest.frozenLineages,
          history: transferTest.frozenLineages.map(() => []),
        },
      };
    }
    return loadTrackSession(activeTrackId, activeMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTrackId, activeMode, inTransferTest]);

  const handleRoundEnded = useCallback(
    (trackSerialized) => {
      if (inTransferTest) return; // a frozen test run is never saved
      const save = loadSave();
      const tracks = { ...(save?.tracks ?? {}) };
      tracks[trackDef.id] = { ...tracks[trackDef.id], [activeMode]: trackSerialized };
      writeSave(buildSaveFile(settingsRef.current, tracks));
    },
    [trackDef.id, activeMode, inTransferTest]
  );

  const {
    world,
    snapshot,
    effectsRef,
    learnedLineCacheRef,
    interpAlphaRef,
    lastRoundReport,
    playing,
    speedId,
    pauseSwitches,
    play,
    pause,
    togglePlay,
    setSpeed,
    setPauseSwitches,
    step,
    restartRound,
    resetLearning,
    updateSettings,
    newSeed,
  } = useWorld({
    trackDef,
    seed: trackSession.seed,
    settings: settingsRef.current,
    saved: trackSession.saved,
    mode: activeMode,
    learningEnabled,
    sessionKey,
    startPaused: reducedMotion,
    onRoundEnded: handleRoundEnded,
  });

  settingsRef.current = snapshot.settings;

  // Persist settings on their own too (e.g. a mid-round Settings change), not only at round end.
  useEffect(() => {
    if (inTransferTest) return;
    const save = loadSave();
    writeSave(buildSaveFile(snapshot.settings, save?.tracks ?? { [trackDef.id]: { [activeMode]: world.serialize() } }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot.settings]);

  const {
    lines: commentaryLines,
    muted: commentaryMuted,
    setMuted: setCommentaryMuted,
    verbose: commentaryVerbose,
    setVerbose: setCommentaryVerbose,
  } = useCommentary({ world, speedId });
  const { unlockedIds, pendingNotice, dismissNotice } = useConceptUnlocks({ world, trackId: activeTrackId, mode });

  const [selectedCarIndex, setSelectedCarIndex] = useState(0);
  const [openDrawer, setOpenDrawer] = useState(null);
  const [ariaSummary, setAriaSummary] = useState('Round 1 is about to start.');

  const brainButtonRef = useRef(null);
  const roundReportButtonRef = useRef(null);
  const learningChartButtonRef = useRef(null);
  const commentaryButtonRef = useRef(null);
  const conceptsButtonRef = useRef(null);
  const settingsButtonRef = useRef(null);
  const aboutButtonRef = useRef(null);
  const drawerButtonRefs = {
    brain: brainButtonRef,
    roundReport: roundReportButtonRef,
    learningChart: learningChartButtonRef,
    commentary: commentaryButtonRef,
    concepts: conceptsButtonRef,
    settings: settingsButtonRef,
    about: aboutButtonRef,
  };

  const toggleDrawer = useCallback((name) => {
    setOpenDrawer((current) => (current === name ? null : name));
  }, []);
  const closeDrawer = useCallback(() => setOpenDrawer(null), []);

  const handleSelectTrack = useCallback(
    (nextTrackId) => {
      if (inTransferTest || nextTrackId === trackId) return;
      setTrackId(nextTrackId);
    },
    [trackId, inTransferTest]
  );

  const handleSelectMode = useCallback(
    (nextMode) => {
      if (inTransferTest || nextMode === mode) return;
      setMode(nextMode);
    },
    [mode, inTransferTest]
  );

  const handleStartTransferTest = useCallback(
    (testTrackId) => {
      if (mode !== 'sensor' || inTransferTest) return;
      // Only the learned network itself transfers. Progress markers
      // (bestDistance, lapsDone, finished) belong to the home track - a
      // car that had already finished there must still be reset to try
      // driving from scratch on the unfamiliar one, not sit retired at
      // the start line showing "Finished".
      const frozenLineages = world.lineages.map((l) => ({
        parent: l.parent,
        bestDistance: 0,
        lapsDone: 0,
        finished: false,
        bestRound: 0,
      }));
      setTransferTest({ testTrackId, seed: randomSeed(), frozenLineages });
    },
    [mode, inTransferTest, world]
  );

  const handleExitTransferTest = useCallback(() => setTransferTest(null), []);

  const handleExport = useCallback(() => {
    if (inTransferTest) return;
    const save = loadSave() ?? buildSaveFile(snapshot.settings, { [trackDef.id]: { [activeMode]: world.serialize() } });
    downloadText(`mlcars-save-${new Date().toISOString().slice(0, 10)}.json`, exportSaveFile(save));
  }, [snapshot.settings, trackDef.id, activeMode, world, inTransferTest]);

  const handleImport = useCallback(
    (text) => {
      const result = importSaveFile(text);
      if (!result.ok) return result.error;
      writeSave(result.saveFile);
      window.location.reload();
      return null;
    },
    []
  );

  const handleOpenUnlockedConcept = useCallback(() => {
    dismissNotice();
    setOpenDrawer('concepts');
  }, [dismissNotice]);

  useEffect(() => {
    const id = setInterval(() => setAriaSummary(buildAriaSummary(snapshot)), 2000);
    return () => clearInterval(id);
  }, [snapshot]);

  useEffect(() => {
    function onKeyDown(e) {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === '.') {
        step();
      } else if (e.key >= '1' && e.key <= '6') {
        setSelectedCarIndex(Number(e.key) - 1);
      } else if (e.key.toLowerCase() === 'r') {
        toggleDrawer('roundReport');
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [togglePlay, step, toggleDrawer]);

  return (
    <div className="app-shell app-shell--game">
      <Toolbar
        playing={playing}
        onTogglePlay={togglePlay}
        onStep={step}
        speedId={speedId}
        onSetSpeed={setSpeed}
        pauseSwitches={pauseSwitches}
        onSetPauseSwitches={setPauseSwitches}
        onRestartRound={restartRound}
        onResetLearning={resetLearning}
        tracks={TRACKS}
        trackId={trackId}
        onSelectTrack={handleSelectTrack}
        mode={mode}
        onSelectMode={handleSelectMode}
        modeDisabled={inTransferTest}
        openDrawer={openDrawer}
        onToggleDrawer={toggleDrawer}
        drawerButtonRefs={drawerButtonRefs}
      />

      {inTransferTest && (
        <TransferTestBanner trackName={trackDef.name} onExit={handleExitTransferTest} />
      )}

      <div className="stage">
        <CarRail snapshot={snapshot} selectedCarIndex={selectedCarIndex} onSelectCar={setSelectedCarIndex} isSensor={activeMode === 'sensor'} />
        <TrackCanvas
          world={world}
          effectsRef={effectsRef}
          learnedLineCacheRef={learnedLineCacheRef}
          interpAlphaRef={interpAlphaRef}
          reducedMotion={reducedMotion}
          ariaSummary={ariaSummary}
          selectedCarIndex={selectedCarIndex}
        />

        <Drawer isOpen={openDrawer === 'brain'} onClose={closeDrawer} title={`Brain: car ${selectedCarIndex + 1}`} returnFocusRef={brainButtonRef}>
          <BrainDrawer carIndex={selectedCarIndex} snapshot={snapshot} world={world} />
        </Drawer>
        <Drawer isOpen={openDrawer === 'roundReport'} onClose={closeDrawer} title="Round report" returnFocusRef={roundReportButtonRef}>
          <RoundReport report={lastRoundReport} />
        </Drawer>
        <Drawer isOpen={openDrawer === 'learningChart'} onClose={closeDrawer} title="Learning chart" returnFocusRef={learningChartButtonRef}>
          <LearningChart world={world} snapshot={snapshot} />
        </Drawer>
        <Drawer isOpen={openDrawer === 'commentary'} onClose={closeDrawer} title="Commentary" returnFocusRef={commentaryButtonRef}>
          <Commentary
            lines={commentaryLines}
            muted={commentaryMuted}
            onSetMuted={setCommentaryMuted}
            verbose={commentaryVerbose}
            onSetVerbose={setCommentaryVerbose}
          />
        </Drawer>
        <Drawer isOpen={openDrawer === 'concepts'} onClose={closeDrawer} title="Concepts" returnFocusRef={conceptsButtonRef}>
          <ConceptsDrawer unlockedIds={unlockedIds} />
        </Drawer>
        <Drawer isOpen={openDrawer === 'settings'} onClose={closeDrawer} title="Settings" returnFocusRef={settingsButtonRef}>
          <SettingsDrawer
            settings={snapshot.settings}
            seed={snapshot.seed}
            onUpdateSettings={updateSettings}
            onNewSeed={newSeed}
            onExport={handleExport}
            onImport={handleImport}
            mode={mode}
            tracks={TRACKS}
            currentTrackId={trackId}
            inTransferTest={inTransferTest}
            onStartTransferTest={handleStartTransferTest}
          />
        </Drawer>
        <Drawer isOpen={openDrawer === 'about'} onClose={closeDrawer} title="About MLCars" returnFocusRef={aboutButtonRef}>
          <AboutDrawer />
        </Drawer>

        {pendingNotice && (
          <ConceptUnlockedNotice concept={pendingNotice} onOpen={handleOpenUnlockedConcept} onDismiss={dismissNotice} />
        )}
      </div>

      <CMFloatAd />
    </div>
  );
}

export default App;
