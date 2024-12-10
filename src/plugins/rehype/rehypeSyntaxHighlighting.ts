import { toString } from 'hast-util-to-string';
import { RefractorElement, RefractorRoot } from 'refractor';
import { refractor } from 'refractor/lib/all.js';
import type { Plugin } from 'unified';
import type { Node } from 'unist';
import { Parent } from 'unist';
import { visit } from 'unist-util-visit';

import blade from '../../lib/syntaxHighlighting/blade.js';

refractor.register(blade);

export type RehypeSyntaxHighlightingOptions = {
  ignoreMissing?: boolean;
  alias?: Record<string, string[]>;
};

export type TreeNode = RefractorElement &
  Node & {
    properties: {
      className?: string[];
    };
  };

export type TreeParent = Parent & {
  tagName: string;
  properties: {
    className?: string[];
  };
};

const lineHighlightPattern = /\{(.*?)\}/;

export const rehypeSyntaxHighlighting: Plugin<[RehypeSyntaxHighlightingOptions?], TreeNode> = (
  options = {}
) => {
  if (options.alias) {
    refractor.alias(options.alias);
  }

  return (tree) => {
    visit(tree, 'element', (node: TreeNode, _index, parent?: TreeParent) => {
      if (!parent || parent.tagName !== 'pre' || node.tagName !== 'code') {
        return;
      }

      const lang = getLanguage(node) || 'plaintext';

      try {
        parent.properties.className = (parent.properties.className || []).concat(
          'language-' + lang
        );
        const code = toString(node);
        const lines = code.split('\n');
        const linesToHighlight = getLinesToHighlight(node, lines.length);

        const nodes = lines.reduce(
          (acc: RefractorRoot['children'], line: string, index: number) => {
            const isNotEmptyLine = line.trim() !== '';
            // Line numbers start from 1
            const isHighlighted = linesToHighlight.includes(index + 1);

            if (isNotEmptyLine) {
              const node: TreeNode = {
                type: 'element',
                tagName: 'span',
                properties: {
                  className: [isHighlighted ? 'line-highlight' : ''],
                },
                children: refractor.highlight(line, lang).children,
              };
              acc.push(node);
            } else {
              acc.push({ type: 'text', value: line });
            }

            if (index < lines.length - 1) {
              acc.push({ type: 'text', value: '\n' });
            }
            return acc;
          },
          []
        );

        if (node.data?.meta) {
          // remove line highlight meta
          node.data.meta = (node.data.meta as string).replace(lineHighlightPattern, '').trim();
        }

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

function getLanguage(node: TreeNode): string | null {
  const className = node.properties.className || [];

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

function getLinesToHighlight(node: TreeNode, maxLines: number): number[] {
  const meta =
    typeof node.data?.meta === 'string'
      ? node.data.meta
      : node.properties.className?.reduce((acc, item) => acc + ' ' + item, '');
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
