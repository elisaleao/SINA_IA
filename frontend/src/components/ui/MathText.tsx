import React from 'react';
import katex from 'katex';

const FORMULA = /\$\$([\s\S]+?)\$\$|(?<!R)\$(?!\s)([^$\n]+?)(?<!\s)\$(?!\d)/g;

type Segment =
  | { kind: 'text'; value: string }
  | { kind: 'math'; html: string };

function renderFormula(tex: string, displayMode: boolean): string | null {
  try {
    return katex.renderToString(tex, {
      displayMode,
      output: 'htmlAndMathml',
      throwOnError: true,
      trust: false,
      strict: 'ignore',
    });
  } catch {
    return null;
  }
}

function splitFormulas(text: string): Segment[] {
  const segments: Segment[] = [];
  let last = 0;
  for (const match of text.matchAll(FORMULA)) {
    const start = match.index ?? 0;
    if (start > last) segments.push({ kind: 'text', value: text.slice(last, start) });
    const display = match[1] !== undefined;
    const html = renderFormula(match[1] ?? match[2] ?? '', display);
    segments.push(html ? { kind: 'math', html } : { kind: 'text', value: match[0] });
    last = start + match[0].length;
  }
  if (last < text.length) segments.push({ kind: 'text', value: text.slice(last) });
  return segments;
}

export interface MathTextProps {
  text: string;
  className?: string;
}

export function MathText({ text, className }: MathTextProps) {
  return (
    <span className={className}>
      {splitFormulas(text).map((segment, index) =>
        segment.kind === 'text' ? (
          <React.Fragment key={index}>{segment.value}</React.Fragment>
        ) : (
          <span key={index} dangerouslySetInnerHTML={{ __html: segment.html }} />
        )
      )}
    </span>
  );
}

export default MathText;
