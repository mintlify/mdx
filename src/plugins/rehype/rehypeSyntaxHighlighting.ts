import { Node, toString } from 'hast-util-to-string';
import rangeParser from 'parse-numeric-range';
import { Text } from 'refractor';
import { RefractorElement, refractor } from 'refractor/lib/all.js';
import { Parent } from 'unist';
import { visit } from 'unist-util-visit';

type TreeNode = Node & {
  value?: string;
  tagName: string;
  children?: TreeNode[];
  properties: {
    className?: string[];
  };
};

export const rehypeSyntaxHighlighting = (options: {
  ignoreMissing?: boolean;
  alias?: Record<string, string[]>;
}) => {
  if (options.alias) {
    refractor.alias(options.alias);
  }

  return (tree: Parent) => {
    visit(
      tree,
      'element',
      (
        node: TreeNode,
        _index,
        parent?: {
          tagName: string;
          properties: {
            className?: string[];
          };
        }
      ) => {
        if (!parent || parent.tagName !== 'pre' || node.tagName !== 'code') {
          return;
        }

        const lang = getLanguage(node);

        if (lang === null) {
          return;
        }

        let result;
        try {
          parent.properties.className = (parent.properties.className || []).concat(
            'language-' + lang
          );
          result = highlight(node, lang);
          //@ts-expect-error unable to import type yet
          node.children = result;
        } catch (err) {
          if (options.ignoreMissing && /Unknown language/.test((err as Error).message)) {
            return;
          }
          throw err;
        }
      }
    );
  };
};

function getLanguage(node: TreeNode) {
  const className = node.properties.className || [];

  for (const classListItem of className) {
    if (classListItem.slice(0, 9) === 'language-') {
      return classListItem.slice(9).toLowerCase();
    }
  }

  return null;
}

function highlight(node: TreeNode, lang: string) {
  // current code components only have 1 child
  if (!node.children || !node.children.length || !node.children[0]?.value) {
    return node;
  }
  if (!node.data || !node.data.meta) {
    return refractor.highlight(toString(node), lang).children;
  }

  const code = node.children[0].value;
  // https://regex101.com/r/RWKM9E
  const regex = /(?:[ \t])?\{([^}\s][^}]*)\}/g;
  const matches = node.data.meta.toString().match(regex);
  if (!matches || !matches.length) {
    return refractor.highlight(toString(node), lang).children;
  }

  const match = matches[0].trim();
  const linesToHighlight = rangeParser(match.substring(1, match.length - 1));

  const nodes = code.split('\n').reduce(
    (
      acc: {
        type: string;
        tagName: string;
        properties?: RefractorElement['properties'];
        children?: (Text | RefractorElement)[];
        value?: string;
      }[],
      line: string,
      index: number
    ) => {
      const node = {
        type: 'element',
        tagName: 'span',
        properties: {
          className: ['line', linesToHighlight.includes(index) ? 'line-highlight' : ''],
        },
        children: refractor.highlight(line, lang).children,
      };
      acc.push(node);
      acc.push({ type: 'text', tagName: 'code', value: '\n' });
      return acc;
    },
    []
  );

  return nodes;
}
