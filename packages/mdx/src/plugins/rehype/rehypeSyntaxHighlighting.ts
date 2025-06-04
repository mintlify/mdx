import { Element, ElementContent, Root } from 'hast';
import { toString } from 'hast-util-to-string';
import { refractor } from 'refractor/lib/all.js';
import { Plugin } from 'unified';
import { visit } from 'unist-util-visit';

import blade from '../../lib/syntaxHighlighting/blade.js';

refractor.register(blade);

export type RehypeSyntaxHighlightingOptions = {
  ignoreMissing?: boolean;
  alias?: Record<string, string[]>;
};

const lineHighlightPattern = /\{(.*?)\}/;

function classNameOrEmptyArray(element: Element): string[] {
  const className = element.properties.className;
  if (Array.isArray(className) && className.every((el) => typeof el === 'string')) return className;
  return [];
}

export const rehypeSyntaxHighlighting: Plugin<[RehypeSyntaxHighlightingOptions?], Root, Root> = (
  options = {}
) => {
  if (options.alias) {
    refractor.alias(options.alias);
  }

  return (tree) => {
    visit(tree, 'element', (node, _index, parent) => {
      if (
        !parent ||
        parent.type !== 'element' ||
        parent.tagName !== 'pre' ||
        node.tagName !== 'code'
      ) {
        return;
      }

      const lang = getLanguage(node) || 'plaintext';

      try {
        parent.properties.className = classNameOrEmptyArray(parent).concat('language-' + lang);
        const code = toString(node);
        const lines = code.split('\n');
        const linesToHighlight = getLinesToHighlight(node, lines.length);

        const nodes = lines.reduce<ElementContent[]>((acc, line, index) => {
          const isNotEmptyLine = line.trim() !== '';
          // Line numbers start from 1
          const isHighlighted = linesToHighlight.includes(index + 1);

          if (isNotEmptyLine) {
            const node: Element = {
              type: 'element',
              tagName: 'span',
              properties: {
                className: [isHighlighted ? 'line-highlight' : ''],
              },
              children: refractor.highlight(line, lang).children as ElementContent[],
            };
            acc.push(node);
          } else {
            acc.push({ type: 'text', value: line });
          }

          if (index < lines.length - 1) {
            acc.push({ type: 'text', value: '\n' });
          }
          return acc;
        }, []);

        node.children = nodes;
      } catch (err) {
        if (options.ignoreMissing && /Unknown language/.test((err as Error).message)) {
          return;
        }
        throw err;
      }
    });
  };
};

function getLanguage(node: Element): string | null {
  const className = classNameOrEmptyArray(node);

  for (const classListItem of className) {
    if (classListItem.slice(0, 9) === 'language-') {
      const lang = classListItem.slice(9).toLowerCase();

      if (refractor.registered(lang)) {
        return lang;
      }
      return null;
    }
  }

  return null;
}

function getLinesToHighlight(node: Element, maxLines: number): number[] {
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
