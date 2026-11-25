import { useEffect, useRef } from 'react';
import { IconClose } from './icons.jsx';

/**
 * A non-modal drawer sliding in over the track (BUILD.md 3.1). The
 * simulation keeps running behind it, focus is never trapped, and Esc
 * closes it and returns focus to whichever button opened it.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {() => void} props.onClose
 * @param {string} props.title
 * @param {import('react').RefObject<HTMLElement>} [props.returnFocusRef] The button that opened this drawer.
 * @param {import('react').ReactNode} props.children
 * @returns {JSX.Element|null}
 */
export function Drawer({ isOpen, onClose, title, returnFocusRef, children }) {
  const headingRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    headingRef.current?.focus();

    function onKeyDown(e) {
      if (e.key !== 'Escape') return;
      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;
      onClose();
      returnFocusRef?.current?.focus();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose, returnFocusRef]);

  if (!isOpen) return null;

  return (
    <section className="drawer" aria-label={title}>
      <div className="drawer__header">
        <h2 className="drawer__title" tabIndex={-1} ref={headingRef}>
          {title}
        </h2>
        <button
          type="button"
          className="drawer__close"
          onClick={() => {
            onClose();
            returnFocusRef?.current?.focus();
          }}
        >
          <IconClose />
          <span className="visually-hidden">Close {title}</span>
        </button>
      </div>
      <div className="drawer__body">{children}</div>
    </section>
  );
}
