import { useState } from 'react';
import { CONCEPTS } from '../content/concepts.js';
import { FormattedText } from './FormattedText.jsx';
import { IconLock } from './icons.jsx';

const LEVEL_LABELS = { L2: 'Level 2', L3: 'Level 3', T: 'T Level maths' };

/**
 * One concept card: locked (title only), upcoming (Phase 3, title only,
 * permanently not-yet-built), or unlocked (full content with a Go
 * deeper toggle and the discussion question).
 *
 * @param {Object} props
 * @param {import('../content/concepts.js').Concept} props.concept
 * @param {boolean} props.unlocked
 * @returns {JSX.Element}
 */
function ConceptCard({ concept, unlocked }) {
  const [deeperOpen, setDeeperOpen] = useState(false);
  const isPhase3 = concept.trigger === 'phase3';

  return (
    <article className={`concept-card${unlocked ? '' : ' concept-card--locked'}`}>
      <div className="concept-card__header">
        <h4 className="concept-card__title">{concept.title}</h4>
        <span className="concept-card__level">{LEVEL_LABELS[concept.level]}</span>
      </div>

      {!unlocked ? (
        <p className="concept-card__locked-note">
          <IconLock aria-hidden="true" width={16} height={16} />
          {isPhase3 ? 'Unlocks in Phase 3, with the sensor cars.' : 'Not unlocked yet. Keep the simulation running.'}
        </p>
      ) : (
        <>
          <p className="concept-card__plain">
            <FormattedText text={concept.plain} />
          </p>
          <button type="button" className="button button--secondary button--compact" onClick={() => setDeeperOpen((o) => !o)} aria-expanded={deeperOpen}>
            {deeperOpen ? 'Hide the detail' : 'Go deeper'}
          </button>
          {deeperOpen && (
            <div className="concept-card__deeper">
              <p>
                <FormattedText text={concept.deeper} />
              </p>
              <p className="concept-card__ask">
                <strong>Ask the class:</strong> {concept.ask}
              </p>
            </div>
          )}
        </>
      )}
    </article>
  );
}

/**
 * The Concepts drawer (BUILD.md 3.3 and section 7): the glossary of
 * concept cards, in the fixed teaching order, each gated behind the
 * "unlocked" state computed by useConceptUnlocks.
 *
 * @param {Object} props
 * @param {Set<string>} props.unlockedIds
 * @returns {JSX.Element}
 */
export function ConceptsDrawer({ unlockedIds }) {
  const unlockedCount = CONCEPTS.filter((c) => unlockedIds.has(c.id)).length;

  return (
    <div className="concepts-drawer">
      <p className="concepts-drawer__progress">
        {unlockedCount} of {CONCEPTS.length} concepts unlocked so far.
      </p>
      {CONCEPTS.map((concept) => (
        <ConceptCard key={concept.id} concept={concept} unlocked={unlockedIds.has(concept.id)} />
      ))}
    </div>
  );
}
