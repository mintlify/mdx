import type { ShikiTransformer } from '@shikijs/types';
import type { Element } from 'hast';

type Token = {
  element: Element;
  text: string;
  style: string;
  start: number;
  end: number;
};

const placeholderPattern = /<[^\s<>]{2,}>/g;

function styledPart(token: Token, text: string, style: string): Element {
  return {
    ...token.element,
    properties: { ...token.element.properties, style },
    children: [{ type: 'text', value: text }],
  };
}

function fixLine(line: Element): void {
  const tokens: Token[] = [];
  let offset = 0;

  for (const child of line.children) {
    if (child.type !== 'element' || child.tagName !== 'span' || child.children.length !== 1) {
      return;
    }

    const text = child.children[0];
    const style = child.properties.style;
    if (text?.type !== 'text' || typeof style !== 'string') return;

    tokens.push({
      element: child,
      text: text.value,
      style,
      start: offset,
      end: offset + text.value.length,
    });
    offset += text.value.length;
  }

  const code = tokens.map((token) => token.text).join('');
  const corrections = new Map<Token, { position: number; style: string }[]>();
  let tokenIndex = 0;

  // Placeholder matches are ordered, so each token only needs to be visited once.
  function tokenAt(position: number): Token | undefined {
    let token = tokens[tokenIndex];
    while (token && token.end <= position) {
      tokenIndex += 1;
      token = tokens[tokenIndex];
    }
    return token;
  }

  for (const match of code.matchAll(placeholderPattern)) {
    const lastCharacter = match.index + match[0].length - 2;
    const previous = tokenAt(lastCharacter - 1);
    const current = tokenAt(lastCharacter);

    // The shell grammar excludes the character immediately before `>` from an unquoted argument.
    // Restrict the repair to adjacent word characters within a placeholder.
    if (!previous || !current) continue;
    if (!/\w/.test(code[lastCharacter - 1] ?? '') || !/\w/.test(code[lastCharacter] ?? ''))
      continue;
    if (previous.style === current.style) continue;

    const changes = corrections.get(current) ?? [];
    changes.push({ position: lastCharacter, style: previous.style });
    corrections.set(current, changes);
  }

  if (!corrections.size) return;

  line.children = tokens.flatMap((token) => {
    const changes = corrections.get(token);
    if (!changes) return [token.element];

    const parts: Element[] = [];
    let start = 0;
    for (const { position, style } of changes) {
      const localOffset = position - token.start;
      if (start < localOffset) {
        parts.push(styledPart(token, token.text.slice(start, localOffset), token.style));
      }
      parts.push(styledPart(token, token.text.slice(localOffset, localOffset + 1), style));
      start = localOffset + 1;
    }
    if (start < token.text.length) {
      parts.push(styledPart(token, token.text.slice(start), token.style));
    }
    return parts;
  });
}

export const shellPlaceholderTransformer: ShikiTransformer = {
  name: 'shell-placeholder-highlighting',
  line: fixLine,
};
