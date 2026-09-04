import { useState } from 'react';

function CodeBlock({ lang, code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <div className="md-code-wrap">
      <div className="md-code-header">
        <span className="md-code-lang">{lang || 'code'}</span>
        <button type="button" className="md-copy-btn" onClick={handleCopy} aria-label="Copy code">
          {copied ? '✓ Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="md-code-block"><code>{code}</code></pre>
    </div>
  );
}

function MarkdownTable({ lines }) {
  if (lines.length < 2) return null;

  // Split cells by |
  const parseRow = (row) =>
    row
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((c) => c.trim());

  const headerCells = parseRow(lines[0]);
  const rows = lines.slice(2).map(parseRow);

  return (
    <div className="md-table-wrap">
      <table className="md-table">
        <thead>
          <tr>
            {headerCells.map((th, idx) => (
              <th key={idx}>{th}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rIdx) => (
            <tr key={rIdx}>
              {row.map((cell, cIdx) => (
                <td key={cIdx}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function MarkdownLite({ text }) {
  if (!text) return null;

  // Separate any <think> ... </think> blocks (used by reasoning & vision models)
  let thinkingContent = null;
  let isStillThinking = false;
  let mainText = text;

  if (text.includes('<think>')) {
    if (text.includes('</think>')) {
      const parts = text.split('</think>');
      thinkingContent = parts[0].replace('<think>', '').trim();
      mainText = parts.slice(1).join('</think>').trim();
    } else {
      thinkingContent = text.replace('<think>', '').trim();
      isStillThinking = true;
      mainText = '';
    }
  }

  const blocks = mainText ? mainText.split(/\n{2,}/) : [];

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
      {/* Collapsible reasoning / thought process */}
      {thinkingContent && (
        <details className="md-thinking-accordion" open={isStillThinking}>
          <summary className="md-thinking-summary">
            <span className="md-thinking-icon">💭</span>
            <span>{isStillThinking ? 'Thinking & analyzing visual data…' : 'Visual Reasoning'}</span>
            {isStillThinking && <span className="md-thinking-pulse" />}
          </summary>
          <div className="md-thinking-body">
            <p className="md-thinking-text">{thinkingContent}</p>
          </div>
        </details>
      )}

      {/* Main response blocks */}
      {blocks.map((block, i) => {
        const trimmed = block.trim();

        // Fenced Code Block
        if (trimmed.startsWith('```')) {
          const langMatch = trimmed.match(/^```([a-zA-Z0-9_-]*)\n?/);
          const lang = langMatch ? langMatch[1] : '';
          const code = trimmed.replace(/^```[a-zA-Z0-9_-]*\n?/, '').replace(/```$/, '');
          return <CodeBlock key={i} lang={lang} code={code} />;
        }

        const lines = trimmed.split('\n');

        // Markdown Table: header line with |, separator line with | --- |
        if (
          lines.length >= 2 &&
          lines[0].includes('|') &&
          /^\s*\|?\s*[-:]+[-| :]*\|?\s*$/.test(lines[1])
        ) {
          return <MarkdownTable key={i} lines={lines} />;
        }

        // Headings: #, ##, ###
        if (lines.length === 1 && /^#{1,4}\s/.test(trimmed)) {
          const level = trimmed.match(/^(#{1,4})\s/)[1].length;
          const headingText = trimmed.replace(/^#{1,4}\s/, '');
          const Tag = `h${level + 2}`;
          return <Tag key={i} className="md-heading">{renderInline(headingText, i)}</Tag>;
        }

        // Blockquotes
        if (lines.every((l) => l.trim().startsWith('>'))) {
          const quoteText = lines.map((l) => l.trim().replace(/^>\s?/, '')).join(' ');
          return (
            <blockquote key={i} className="md-quote">
              {renderInline(quoteText, i)}
            </blockquote>
          );
        }

        // Lists
        const isList = lines.every((l) => /^(-|\*|\d+\.)\s/.test(l.trim()));
        if (isList) {
          const ordered = /^\d+\./.test(lines[0].trim());
          const Tag = ordered ? 'ol' : 'ul';
          return (
            <Tag key={i} className="md-list">
              {lines.map((l, j) => (
                <li key={j}>{renderInline(l.replace(/^(-|\*|\d+\.)\s/, ''), `${i}-${j}`)}</li>
              ))}
            </Tag>
          );
        }

        // Regular paragraph
        return (
          <p key={i} className="md-para">
            {lines.map((l, j) => (
              <span key={j}>
                {renderInline(l, `${i}-${j}`)}
                {j < lines.length - 1 && <br />}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}