import type { Element } from 'hast';

import { type ShikiLang } from './shiki-constants.js';

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
