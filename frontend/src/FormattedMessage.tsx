import React from 'react';

/**
 * Minimal, dependency-free formatter for LLM chat output. Handles the subset of
 * markdown the analysis agent produces: headings, paragraphs, line breaks,
 * **bold**, *italic*, `code`, bullet lists ("- " / "• " / "* ", nested by
 * indentation), numbered lists ("1. "), horizontal rules, simple tables, and
 * literal escape sequences (\n, \t) that sometimes arrive as raw characters
 * instead of real whitespace.
 */
export function FormattedMessage({ content }: { content: string }): React.ReactElement {
  const normalized = content.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {parseBlocks(normalized)}
    </div>
  );
}

const BULLET = /^(\s*)[-•*]\s+(.*)$/;
const NUMBERED = /^(\s*)\d+[.)]\s+(.*)$/;
const HEADING = /^#{1,6}\s+(.*)$/;
const RULE = /^\s*([-*_])(\s*\1){2,}\s*$/;
const TABLE_ROW = /^\s*\|.*\|\s*$/;
const TABLE_DIVIDER = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/;

function parseBlocks(text: string): React.ReactElement[] {
  const lines = text.split('\n');
  const blocks: React.ReactElement[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const key = blocks.length;

    if (!line.trim()) { i++; continue; }

    if (RULE.test(line)) {
      blocks.push(<hr key={key} style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '2px 0' }} />);
      i++;
      continue;
    }

    const heading = line.trim().match(HEADING);
    if (heading) {
      blocks.push(
        <div key={key} style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: blocks.length ? '4px' : 0 }}>
          {renderInline(heading[1].replace(/\*\*/g, ''))}
        </div>,
      );
      i++;
      continue;
    }

    if (TABLE_ROW.test(line)) {
      const rows: string[][] = [];
      while (i < lines.length && TABLE_ROW.test(lines[i])) {
        if (!TABLE_DIVIDER.test(lines[i])) {
          rows.push(lines[i].trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
        }
        i++;
      }
      blocks.push(renderTable(rows, key));
      continue;
    }

    if (BULLET.test(line) || NUMBERED.test(line)) {
      const ordered = !BULLET.test(line);
      const items: { depth: number; text: string }[] = [];
      while (i < lines.length && (BULLET.test(lines[i]) || NUMBERED.test(lines[i]))) {
        const m = lines[i].match(BULLET) ?? lines[i].match(NUMBERED)!;
        items.push({ depth: Math.min(Math.floor(m[1].replace(/\t/g, '  ').length / 2), 3), text: m[2] });
        i++;
      }
      const ListTag = ordered ? 'ol' : 'ul';
      blocks.push(
        <ListTag key={key} style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {items.map((it, j) => (
            <li key={j} style={{ marginLeft: `${it.depth * 18}px`, listStyleType: it.depth ? 'circle' : undefined }}>
              {renderInline(it.text)}
            </li>
          ))}
        </ListTag>,
      );
      continue;
    }

    // Paragraph: consecutive plain lines, kept as line breaks.
    const para: string[] = [];
    while (
      i < lines.length && lines[i].trim() &&
      !RULE.test(lines[i]) && !HEADING.test(lines[i].trim()) && !TABLE_ROW.test(lines[i]) &&
      !BULLET.test(lines[i]) && !NUMBERED.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={key} style={{ margin: 0 }}>
        {para.map((l, j) => (
          <React.Fragment key={j}>
            {renderInline(l)}
            {j < para.length - 1 && <br />}
          </React.Fragment>
        ))}
      </p>,
    );
  }
  return blocks;
}

function renderTable(rows: string[][], key: number): React.ReactElement {
  const [head, ...body] = rows;
  const cell: React.CSSProperties = { padding: '5px 10px', borderBottom: '1px solid var(--border)', textAlign: 'left', verticalAlign: 'top' };
  return (
    <div key={key} style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', fontSize: '13px', width: '100%' }}>
        {head && (
          <thead>
            <tr>{head.map((c, j) => <th key={j} style={{ ...cell, fontWeight: 700 }}>{renderInline(c)}</th>)}</tr>
          </thead>
        )}
        <tbody>
          {body.map((r, j) => (
            <tr key={j}>{r.map((c, k) => <td key={k} style={cell}>{renderInline(c)}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderInline(text: string): React.ReactNode {
  // **bold**, `code`, then *italic* / _italic_
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*|\b_[^_]+_\b)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code key={i} style={{ fontSize: '0.9em', background: 'var(--bg-elevated)', borderRadius: '4px', padding: '1px 5px' }}>
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.length > 2 && ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_')))) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}
