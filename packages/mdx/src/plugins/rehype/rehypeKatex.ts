import type { Element, ElementContent, Root, RootContent } from 'hast';
import { toString } from 'hast-util-to-string';
import rehypeKatex, { type Options } from 'rehype-katex';
import { SKIP, visit } from 'unist-util-visit';
import type { VFile } from 'vfile';

import { classNameOrEmptyArray } from './utils.js';

const MAX_SNIPPET_LENGTH = 80;

const isMathElement = (element: Element) => {
  const classes = classNameOrEmptyArray(element);
  return (
    classes.includes('language-math') ||
    classes.includes('math-inline') ||
    classes.includes('math-display')
  );
};

const getMathScope = (element: Element): Element | undefined => {
  if (element.tagName === 'pre') {
    const code = element.children.find(
      (child): child is Element => child.type === 'element' && child.tagName === 'code'
    );
    return code && classNameOrEmptyArray(code).includes('language-math') ? element : undefined;
  }
  return isMathElement(element) ? element : undefined;
};

const formatLocation = (file: VFile, element: Element) => {
  const start = element.position?.start;
  const location = start ? `${start.line}:${start.column}` : undefined;
  return [file.path, location].filter(Boolean).join(':') || 'MDX';
};

const formatSnippet = (element: Element) => {
  const text = toString(element).trim();
  return text.length > MAX_SNIPPET_LENGTH ? `${text.slice(0, MAX_SNIPPET_LENGTH)}…` : text;
};

export const rehypeKatexWithLocation = (options: Readonly<Options> = {}) => {
  let current: { element: Element; file: VFile } | undefined;

  const transform = rehypeKatex({
    ...options,
    strict: (errorCode: string, errorMsg: string) => {
      if (current) {
        console.warn(
          `${formatLocation(
            current.file,
            current.element
          )}: LaTeX-incompatible input in math "${formatSnippet(
            current.element
          )}": ${errorMsg} [${errorCode}]`
        );
      }
      return 'ignore';
    },
  });

  return (tree: Root, file: VFile) => {
    const matches: { scope: Element; parent: { children: RootContent[] } }[] = [];

    visit(tree, 'element', (element, _index, parent) => {
      const scope = getMathScope(element);
      if (!scope || !parent) return;
      matches.push({ scope, parent });
      return SKIP;
    });

    for (const { scope, parent } of matches) {
      const root: Root = { type: 'root', children: [scope] };
      current = { element: scope, file };
      try {
        transform(root, file);
      } finally {
        current = undefined;
      }
      parent.children.splice(
        parent.children.indexOf(scope),
        1,
        ...(root.children as ElementContent[])
      );
    }
  };
};
