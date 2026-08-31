import { useState } from 'react';

// A small, dependency-free markdown renderer covering what an AI reply
// actually needs: paragraphs, **bold**, *italic*, `inline code`, fenced
// code blocks (now with a language label + copy button), markdown/bare
// links, and - / 1. lists. Not a full CommonMark parser, and it doesn't
// need to be for this use case.

function CodeBlock({ lang, code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked (e.g. insecure context) — button just won't confirm */
    }
  };

  return (
    <div className="md-code-wrap">
      <div className="md-code-header">
        <span className="md-code-lang">{lang || 'text'}</span>
        <button type="button" className="md-copy-btn" onClick={handleCopy}>
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="md-code-block"><code>{code}</code></pre>
    </div>
  );
}

export default function MarkdownLite({ text }) {
  if (!text) return null;

  const blocks = text.split(/\n{2,}/);

  const renderInline = (line, key) => {
    const parts = [];
    let remaining = line;
    let i = 0;
    const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|https?:\/\/[^\s)]+|\*[^*]+\*)/;

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
      } else if (token.startsWith('[')) {
        const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (linkMatch) {
          parts.push(
            <a key={`${key}-${i++}`} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" className="md-link">
              {linkMatch[1]}
            </a>
          );
        } else {
          parts.push(token);
        }
      } else if (token.startsWith('http')) {
        parts.push(
          <a key={`${key}-${i++}`} href={token} target="_blank" rel="noopener noreferrer" className="md-link">
            {token}
          </a>
        );
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
          const langMatch = block.match(/^```([a-zA-Z0-9]*)\n?/);
          const lang = langMatch ? langMatch[1] : '';
          const code = block.replace(/^```[a-zA-Z0-9]*\n?/, '').replace(/```$/, '');
          return <CodeBlock key={i} lang={lang} code={code} />;
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