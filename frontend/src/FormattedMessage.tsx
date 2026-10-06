import React from 'react';

/**
 * Minimal, dependency-free formatter for LLM chat output. Handles the subset of
 * markdown the analysis agent is likely to produce: paragraphs, line breaks,
 * **bold**, bullet lists ("- " / "• "), numbered lists ("1. "), and literal
 * escape sequences (\n, \t) that sometimes arrive as raw characters instead of
 * real whitespace.
 */
export function FormattedMessage({ content }: { content: string }): React.ReactElement {
  const normalized = content.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
  const blocks = normalized.split(/\n{2,}/);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {blocks.map((block, i) => renderBlock(block, i))}
    </div>
  );
}

function renderBlock(block: string, key: number): React.ReactElement {
  const lines = block.split('\n').filter((l) => l.trim().length > 0);
  const isBulletList = lines.length > 0 && lines.every((l) => /^[-•*]\s+/.test(l.trim()));
  const isNumberedList = lines.length > 0 && lines.every((l) => /^\d+[.)]\s+/.test(l.trim()));

  if (isBulletList) {
    return (
      <ul key={key} style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {lines.map((l, i) => (
          <li key={i}>{renderInline(l.trim().replace(/^[-•*]\s+/, ''))}</li>
        ))}
      </ul>
    );
  }

  if (isNumberedList) {
    return (
      <ol key={key} style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {lines.map((l, i) => (
          <li key={i}>{renderInline(l.trim().replace(/^\d+[.)]\s+/, ''))}</li>
        ))}
      </ol>
    );
  }

  return (
    <p key={key} style={{ margin: 0 }}>
      {block.split('\n').map((line, i, arr) => (
        <React.Fragment key={i}>
          {renderInline(line)}
          {i < arr.length - 1 && <br />}
        </React.Fragment>
      ))}
    </p>
  );
}

function renderInline(text: string): React.ReactNode {
  // Bold: **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}
