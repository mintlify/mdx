import { toString } from 'hast-util-to-string';
import { RefractorElement } from 'refractor';
import { refractor } from 'refractor/lib/all.js';
import type { Plugin } from 'unified';
import { Parent } from 'unist';
import { visit } from 'unist-util-visit';

export type RehypeSyntaxHighlightingOptions = {
  ignoreMissing?: boolean;
  alias?: Record<string, string[]>;
};

export type TreeNode = RefractorElement & {
  type: 'element' | 'text';
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
  if (options?.alias) {
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

        const nodes = lines.reduce((acc: RefractorElement[], line: string, index: number) => {
          const isNotEmptyLine = line.trim() !== '';
          const isHighlighted = linesToHighlight.includes(index + 1); // Line numbers start from 1

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
            acc.push({ type: 'text', value: line } as any);
          }

          if (index < lines.length - 1) {
            acc.push({ type: 'text', value: '\n' } as any);
          }
          return acc;
        }, []);

        if (node.data?.meta) {
          // remove line highlight meta
          node.data.meta = removeLineHighlightMeta(node.data.meta.toString());
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

function getLanguage(node: TreeNode) {
  const className = node.properties?.className || [];

  for (const classListItem of className) {
    if (classListItem.slice(0, 9) === 'language-') {
      return classListItem.slice(9).toLowerCase();
    }
  }

  return null;
}

function getLinesToHighlight(node: TreeNode, maxLines: number): number[] {
  const meta = node.data?.meta?.toString();
  if (!meta) return [];

  const content = meta.match(lineHighlightPattern)?.[1]?.trim();
  if (!content) return [];

  const lineNumbers = new Set<number>();

  content.split(',').forEach((part) => {
    const [start, end] = part.split('-').map((num) => {
      const trimmed = num.trim();
      if (!/^\d+$/.test(trimmed)) return undefined;
      const parsed = parseInt(trimmed, 10);
      return parsed > maxLines ? undefined : parsed;
    });

    if (start === undefined) return;
    const endLine = end ?? start;

    if (endLine < start) return;

    for (let i = start; i <= Math.min(endLine, maxLines); i++) {
      lineNumbers.add(i);
    }
  });

  return Array.from(lineNumbers).sort((a, b) => a - b);
}

function removeLineHighlightMeta(meta: string): string {
  return meta.replace(lineHighlightPattern, '').trim();
}
