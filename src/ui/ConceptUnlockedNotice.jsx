import { useEffect } from 'react';
import { IconClose } from './icons.jsx';

const AUTO_DISMISS_MS = 8000;

/**
 * The small, non-blocking "Concept unlocked" notice at the edge of the
 * stage (BUILD.md 3.3). Auto-dismisses after a while so it never piles
 * up; the slide-in is plain CSS, so the global prefers-reduced-motion
 * rule in index.css already removes it when that is set.
 *
 * @param {Object} props
 * @param {import('../content/concepts.js').Concept} props.concept
 * @param {() => void} props.onOpen Open the Concepts drawer, scrolled to this card.
 * @param {() => void} props.onDismiss
 * @returns {JSX.Element}
 */
export function ConceptUnlockedNotice({ concept, onOpen, onDismiss }) {
  useEffect(() => {
    const id = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(id);
  }, [concept, onDismiss]);

  return (
    <div className="concept-notice" role="status">
      <p className="concept-notice__label">Concept unlocked</p>
      <p className="concept-notice__title">{concept.title}</p>
      <div className="concept-notice__actions">
        <button type="button" className="button button--secondary button--compact" onClick={onOpen}>
          Read it
        </button>
        <button type="button" className="concept-notice__dismiss" onClick={onDismiss}>
          <IconClose />
          <span className="visually-hidden">Dismiss</span>
        </button>
      </div>
    </div>
  );
}
