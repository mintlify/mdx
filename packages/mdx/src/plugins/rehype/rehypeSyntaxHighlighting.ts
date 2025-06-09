import type { Element, Root } from 'hast';
import { toString } from 'hast-util-to-string';
import {
  createHighlighter,
  type Highlighter,
  type BuiltinTheme,
  type BundledTheme,
  type BundledLanguage,
} from 'shiki';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';

import {
  BASE_LANGUAGES,
  DEFAULT_LANG_ALIASES,
  UNIQUE_LANGS,
  type ShikiLang,
} from './shiki-constants.js';

const shikiColorReplacements: Partial<Record<BundledTheme, string | Record<string, string>>> = {
  'dark-plus': {
    '#1e1e1e': 'transparent',
    '#569cd6': '#9cdcfe',
    '#c8c8c8': '#f3f7f6',
    '#d4d4d4': '#f3f7f6',
  },
  'github-light-default': {
    '#fff': 'transparent',
    '#ffffff': 'transparent',
  },
};

export type RehypeSyntaxHighlightingOptions = {
  ignoreMissing?: boolean;
  alias?: Record<string, ShikiLang>;
  theme?: BuiltinTheme;
  themes?: Record<'light' | 'dark', BuiltinTheme>;
  codeStyling?: 'dark' | 'system';
};

const lineHighlightPattern = /\{(.*?)\}/;

function classNameOrEmptyArray(element: Element): string[] {
  const className = element.properties.className;
  if (Array.isArray(className) && className.every((el) => typeof el === 'string')) return className;
  return [];
}

let highlighterPromise: Promise<Highlighter> | null = null;

async function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ['github-light-default', 'dark-plus'],
      langs: UNIQUE_LANGS,
    });
  }
  return highlighterPromise;
}

export const rehypeSyntaxHighlighting: Plugin<[RehypeSyntaxHighlightingOptions?], Root, Root> = (
  options = {}
) => {
  const languageAliases = { ...options.alias, ...DEFAULT_LANG_ALIASES };

  return async (tree) => {
    const highlighter = await getHighlighter();

    visit(tree, 'element', (node, index, parent) => {
      const child = node.children[0];
      if (
        !parent ||
        index === undefined ||
        node.type !== 'element' ||
        node.tagName !== 'pre' ||
        !child ||
        child.type !== 'element' ||
        child.tagName !== 'code'
      ) {
        return;
      }

      // set the metadata of `node` (which is a pre element) to that of
      // `child` (which is the code element that likely contains all the metadata)
      if (!Object.keys(node.properties).length) {
        node.properties = child.properties;
      }
      if (!node.data) {
        node.data = child.data;
      }

      let lang =
        getLanguage(node, languageAliases) ?? getLanguage(child, languageAliases) ?? 'text';

      if (!BASE_LANGUAGES.includes(lang)) {
        highlighter.loadLanguage(lang as BundledLanguage);
      }

      try {
        const code = toString(node);
        const lines = code.split('\n');
        let linesToHighlight = getLinesToHighlight(node, lines.length);

        const hast = highlighter.codeToHast(code, {
          lang: lang ?? 'text',
          themes: {
            light: 'github-light-default',
            dark: 'dark-plus',
          },
          colorReplacements: shikiColorReplacements,
          tabindex: false,
          tokenizeMaxLineLength: 1000,
        });

        const codeElement = hast.children[0] as Element;
        if (!codeElement) return;

        let lineNumber = 0;
        visit(codeElement, 'element', (span, _, spanParent) => {
          if (
            !spanParent ||
            spanParent.type !== 'element' ||
            spanParent.tagName !== 'code' ||
            span.tagName !== 'span' ||
            (typeof span.properties.class !== 'string' && !Array.isArray(span.properties.class)) ||
            !span.properties.class.includes('line')
          ) {
            return;
          }

          lineNumber++;
          if (linesToHighlight.includes(lineNumber)) {
            if (typeof span.properties.class === 'string') {
              span.properties.class += ' line-highlight';
            } else {
              span.properties.class = [...span.properties.class, 'line-highlight'];
            }
          }
        });

        if (node.data?.meta) {
          node.data.meta = node.data.meta.replace(lineHighlightPattern, '').trim();
        }
        codeElement.data = node.data;
        if (codeElement.children[0]) codeElement.children[0].data = node.data;
        parent.children.splice(index, 1, codeElement);
      } catch (err) {
        if (options.ignoreMissing && /Unknown language/.test((err as Error).message)) {
          return;
        }
        throw err;
      }
    });
  };
};

function getLanguage(node: Element, aliases: Record<string, ShikiLang>): ShikiLang | undefined {
  const className = classNameOrEmptyArray(node);

  for (const classListItem of className) {
    if (classListItem.startsWith('language-')) {
      const lang = classListItem.slice(9).toLowerCase();
      if (lang) return aliases[lang];
    }
  }

  return undefined;
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
