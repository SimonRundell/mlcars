/**
 * Renders plain authored text with `**bold**` spans turned into real
 * `<strong>` elements, without any HTML parsing or dangerouslySetInnerHTML
 * (the only markup this content ever needs - see src/content/concepts.js).
 *
 * @param {Object} props
 * @param {string} props.text
 * @returns {JSX.Element}
 */
export function FormattedText({ text }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>
      )}
    </>
  );
}
