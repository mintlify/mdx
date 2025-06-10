import type { Element } from 'hast';

import { type ShikiLang } from './shiki-constants.js';

export const lineHighlightPattern = /\{(.*?)\}/;
export const LINE_HIGHLIGHT_CLASS = 'line-highlight';

export function classNameOrEmptyArray(element: Element): string[] {
  const className = element.properties.className;
  if (Array.isArray(className) && className.every((el) => typeof el === 'string')) return className;
  return [];
}

export function getLanguage(
  node: Element,
  aliases: Record<string, ShikiLang>
): ShikiLang | undefined {
  const className = classNameOrEmptyArray(node);

  for (const classListItem of className) {
    if (classListItem.startsWith('language-')) {
      const lang = classListItem.slice(9).toLowerCase();
      if (lang) return aliases[lang];
    }
  }

  return undefined;
}

export function getLinesToHighlight(node: Element, maxLines: number): number[] {
  const meta =
    typeof node.data?.meta === 'string'
      ? node.data.meta
      : classNameOrEmptyArray(node).reduce((acc, item) => acc + ' ' + item, '');
  if (!meta) return [];

  const content = meta.match(lineHighlightPattern)?.[1]?.trim();
  if (!content) return [];

  const lineNumbers = new Set<number>();

  content.split(',').forEach((part) => {
    const [start, end] = part.split('-').map((num) => {
      const trimmed = num.trim();
      if (!/^\d+$/.test(trimmed)) return undefined;
      const parsed = parseInt(trimmed, 10);
      return parsed > maxLines ? maxLines : parsed;
    });

    if (!start) return;
    const endLine = end ?? start;

    if (endLine < start) return;
    const max = Math.min(endLine, maxLines);
    for (let i = start; i <= max; i++) {
      lineNumbers.add(i);
    }
  });

  return Array.from(lineNumbers).sort((a, b) => a - b);
}
