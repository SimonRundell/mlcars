/**
 * Custom inline SVG icons (BUILD.md 3.4: no emoji, no icon font). Every
 * icon that carries meaning also has a text label wherever it is used -
 * these components are decorative only, so callers mark them
 * aria-hidden and supply their own visible or screen-reader label.
 */

const common = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  'aria-hidden': 'true',
  focusable: 'false',
};

/** @returns {JSX.Element} */
export function IconPlay(props) {
  return (
    <svg {...common} {...props}>
      <path d="M6 4 L20 12 L6 20 Z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

/** @returns {JSX.Element} */
export function IconPause(props) {
  return (
    <svg {...common} {...props}>
      <rect x="5" y="4" width="5" height="16" rx="1.5" fill="currentColor" />
      <rect x="14" y="4" width="5" height="16" rx="1.5" fill="currentColor" />
    </svg>
  );
}

/** @returns {JSX.Element} */
export function IconStep(props) {
  return (
    <svg {...common} {...props}>
      <path d="M5 4 L14 12 L5 20 Z" fill="currentColor" />
      <rect x="17" y="4" width="3" height="16" rx="1" fill="currentColor" />
    </svg>
  );
}

/** @returns {JSX.Element} */
export function IconRestart(props) {
  return (
    <svg {...common} {...props}>
      <path
        d="M19 12a7 7 0 1 1-2.1-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M19 4 L19 9 L14 9 Z" fill="currentColor" />
    </svg>
  );
}

/** @returns {JSX.Element} */
export function IconReset(props) {
  return (
    <svg {...common} {...props}>
      <path d="M5 7 H19 M9 7 V5 H15 V7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 7 L8 20 H16 L17 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

/** @returns {JSX.Element} */
export function IconBrain(props) {
  return (
    <svg {...common} {...props}>
      <path
        d="M9 4c-2.2 0-4 1.8-4 4 0 .7.2 1.4.5 2C4.6 10.6 4 11.7 4 13c0 2.2 1.8 4 4 4h.5c.3 1.7 1.8 3 3.5 3s3.2-1.3 3.5-3h.5c2.2 0 4-1.8 4-4 0-1.3-.6-2.4-1.5-3 .3-.6.5-1.3.5-2 0-2.2-1.8-4-4-4-.8 0-1.5.2-2 .6-.5-.4-1.2-.6-2-.6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

/** @returns {JSX.Element} */
export function IconReport(props) {
  return (
    <svg {...common} {...props}>
      <rect x="5" y="3" width="14" height="18" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <line x1="8" y1="8" x2="16" y2="8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="8" y1="16" x2="13" y2="16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

/** @returns {JSX.Element} */
export function IconSettings(props) {
  return (
    <svg {...common} {...props}>
      <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M17.8 6.2l-1.6 1.6M7.8 16.2l-1.6 1.6M17.8 17.8l-1.6-1.6M7.8 7.8 6.2 6.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** @returns {JSX.Element} */
export function IconClose(props) {
  return (
    <svg {...common} {...props}>
      <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

/** @returns {JSX.Element} */
export function IconChart(props) {
  return (
    <svg {...common} {...props}>
      <path d="M4 20 V4 M4 20 H20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M6 16 L10 10 L14 13 L19 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** @returns {JSX.Element} */
export function IconCommentary(props) {
  return (
    <svg {...common} {...props}>
      <path
        d="M4 5h16v11H9l-4 4v-4H4Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <line x1="7" y1="9" x2="17" y2="9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="7" y1="12.5" x2="14" y2="12.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

/** @returns {JSX.Element} */
export function IconConcepts(props) {
  return (
    <svg {...common} {...props}>
      <path d="M6 4h9l3 3v13H6Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <line x1="9" y1="10" x2="15" y2="10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="9" y1="14" x2="15" y2="14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

/** @returns {JSX.Element} */
export function IconAbout(props) {
  return (
    <svg {...common} {...props}>
      <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="8" r="0.9" fill="currentColor" />
      <line x1="12" y1="11" x2="12" y2="17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/** @returns {JSX.Element} */
export function IconDownload(props) {
  return (
    <svg {...common} {...props}>
      <path d="M12 4v11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M7 11l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 19h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/** @returns {JSX.Element} */
export function IconUpload(props) {
  return (
    <svg {...common} {...props}>
      <path d="M12 20V9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M7 13l5-5 5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 19h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/** @returns {JSX.Element} */
export function IconLock(props) {
  return (
    <svg {...common} {...props}>
      <rect x="6" y="11" width="12" height="9" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

/** @returns {JSX.Element} */
export function IconFlag(props) {
  return (
    <svg {...common} {...props}>
      <line x1="6" y1="3" x2="6" y2="21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M6 4 L18 7 L6 10 Z" fill="currentColor" />
    </svg>
  );
}
