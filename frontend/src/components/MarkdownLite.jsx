// A small, dependency-free markdown renderer covering what an AI reply
// actually needs: paragraphs, **bold**, *italic*, `inline code`, fenced
// code blocks, and - / 1. lists. Not a full CommonMark parser, and it
// doesn't need to be for this use case.
export default function MarkdownLite({ text }) {
  if (!text) return null;

  const blocks = text.split(/\n{2,}/);

  const renderInline = (line, key) => {
    const parts = [];
    let remaining = line;
    let i = 0;
    const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/;

    while (remaining.length > 0) {
      const match = remaining.match(pattern);
      if (!match) {
        parts.push(remaining);
        break;
      }
      const idx = match.index;
      if (idx > 0) parts.push(remaining.slice(0, idx));
      const token = match[0];
      if (token.startsWith('`')) {
        parts.push(<code key={`${key}-${i++}`} className="md-inline-code">{token.slice(1, -1)}</code>);
      } else if (token.startsWith('**')) {
        parts.push(<strong key={`${key}-${i++}`}>{token.slice(2, -2)}</strong>);
      } else {
        parts.push(<em key={`${key}-${i++}`}>{token.slice(1, -1)}</em>);
      }
      remaining = remaining.slice(idx + token.length);
    }
    return parts;
  };

  return (
    <div className="md-lite">
      {blocks.map((block, i) => {
        if (block.startsWith('```')) {
          const code = block.replace(/^```[a-zA-Z]*\n?/, '').replace(/```$/, '');
          return <pre key={i} className="md-code-block"><code>{code}</code></pre>;
        }
        const lines = block.split('\n');
        const isList = lines.every((l) => /^(-|\d+\.)\s/.test(l.trim()));
        if (isList) {
          const ordered = /^\d+\./.test(lines[0].trim());
          const Tag = ordered ? 'ol' : 'ul';
          return (
            <Tag key={i} className="md-list">
              {lines.map((l, j) => (
                <li key={j}>{renderInline(l.replace(/^(-|\d+\.)\s/, ''), `${i}-${j}`)}</li>
              ))}
            </Tag>
          );
        }
        return (
          <p key={i} className="md-para">
            {lines.map((l, j) => (
              <span key={j}>{renderInline(l, `${i}-${j}`)}{j < lines.length - 1 && <br />}</span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
