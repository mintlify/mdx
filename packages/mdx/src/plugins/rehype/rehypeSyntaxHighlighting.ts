import type { Element, Root } from 'hast';
import { toString } from 'hast-util-to-string';
import type { MdxJsxFlowElementHast, MdxJsxTextElementHast } from 'mdast-util-mdx-jsx';
import { createHighlighter, type Highlighter } from 'shiki';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';

import {
  type ShikiLang,
  type ShikiTheme,
  shikiColorReplacements,
  DEFAULT_LANG_ALIASES,
  SHIKI_THEMES,
  UNIQUE_LANGS,
  DEFAULT_LANG,
  DEFAULT_DARK_THEME,
  DEFAULT_LIGHT_THEME,
  DEFAULT_THEMES,
  DEFAULT_LANGS,
} from './shiki-constants.js';
import { getLanguage } from './utils.js';

export type RehypeSyntaxHighlightingOptions = {
  theme?: ShikiTheme;
  themes?: Record<'light' | 'dark', ShikiTheme>;
  codeStyling?: 'dark' | 'system';
};

let highlighterPromise: Promise<Highlighter> | null = null;

async function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: DEFAULT_THEMES,
      langs: DEFAULT_LANGS,
    });
  }
  return highlighterPromise;
}

export const rehypeSyntaxHighlighting: Plugin<[RehypeSyntaxHighlightingOptions?], Root, Root> = (
  options = {}
) => {
  return async (tree) => {
    const asyncNodesToProcess: Promise<void>[] = [];
    const themesToLoad: ShikiTheme[] = [];
    if (options.themes) {
      themesToLoad.push(options.themes.dark);
      themesToLoad.push(options.themes.light);
    } else if (options.theme) {
      themesToLoad.push(options.theme);
    }

    const highlighter = await getHighlighter();
    await Promise.all(
      themesToLoad
        .filter(
          (theme): theme is Exclude<ShikiTheme, 'css-variables'> =>
            !DEFAULT_THEMES.includes(theme) && theme !== 'css-variables'
        )
        .map(async (theme) => await highlighter.loadTheme(theme))
    );

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
        getLanguage(node, DEFAULT_LANG_ALIASES) ??
        getLanguage(child, DEFAULT_LANG_ALIASES) ??
        DEFAULT_LANG;

      if (!DEFAULT_LANGS.includes(lang)) {
        asyncNodesToProcess.push(
          highlighter.loadLanguage(lang).then(() => {
            traverseNode(node, index, parent, highlighter, lang, options);
          })
        );
      } else {
        traverseNode(node, index, parent, highlighter, lang, options);
      }
    });
    await Promise.all(asyncNodesToProcess);
  };
};

const traverseNode = (
  node: Element,
  index: number,
  parent: Element | Root | MdxJsxTextElementHast | MdxJsxFlowElementHast,
  highlighter: Highlighter,
  lang: ShikiLang,
  options: RehypeSyntaxHighlightingOptions
) => {
  try {
    const code = toString(node);

    const hast = highlighter.codeToHast(code, {
      lang: lang ?? DEFAULT_LANG,
      themes: {
        light:
          options.themes?.light ??
          options.theme ??
          (options.codeStyling === 'dark' ? DEFAULT_DARK_THEME : DEFAULT_LIGHT_THEME),
        dark: options.themes?.dark ?? options.theme ?? DEFAULT_DARK_THEME,
      },
      colorReplacements: shikiColorReplacements,
      tabindex: false,
      tokenizeMaxLineLength: 1000,
    });

    const codeElement = hast.children[0] as Element;
    if (!codeElement) return;

    const preChild = codeElement.children[0] as Element;

    node.data = node.data ?? {};
    codeElement.data = node.data;
    codeElement.properties.language = lang;
    if (preChild) {
      preChild.data = node.data;
      preChild.properties.language = lang;
    }
    parent.children.splice(index, 1, codeElement);
  } catch (err) {
    if (err instanceof Error && /Unknown language/.test(err.message)) {
      return;
    }
    throw err;
  }
};

export { UNIQUE_LANGS, DEFAULT_LANG_ALIASES, SHIKI_THEMES, ShikiLang, ShikiTheme };
