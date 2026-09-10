import { type } from 'arktype';
import type { Element, ElementContent, Root } from 'hast';
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
  DEFAULT_LANG,
  DEFAULT_DARK_THEME,
  DEFAULT_LIGHT_THEME,
  DEFAULT_THEMES,
  SHIKI_TRANSFORMERS,
  UNIQUE_LANGS,
} from './shiki-constants.js';
import { TextMateGrammar, TextMateGrammarType } from './shiki/custom-language.js';
import { getLanguage } from './utils.js';

export type RehypeSyntaxHighlightingOptions = {
  theme?: ShikiTheme;
  themes?: Record<'light' | 'dark', ShikiTheme>;
  codeStyling?: 'dark' | 'system' | 'light' | Record<string, unknown> | null;
  linkMap?: Map<string, string>;
  customLanguages?: string[];
};

let highlighterPromise: Promise<Highlighter> | null = null;

// grammars are compiled on first use instead of all 30 defaults up front; a cold
// process that highlights two languages should not pay for the other 28
async function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: DEFAULT_THEMES,
      langs: [],
    });
  }
  return highlighterPromise;
}

const languageLoads = new Map<string, Promise<void>>();

function loadLanguage(highlighter: Highlighter, lang: ShikiLang): Promise<void> {
  if (highlighter.getLoadedLanguages().includes(lang)) return Promise.resolve();
  let pending = languageLoads.get(lang);
  if (!pending) {
    pending = highlighter.loadLanguage(lang).finally(() => languageLoads.delete(lang));
    languageLoads.set(lang, pending);
  }
  return pending;
}

type TwoslashModule = {
  transformerTwoslash: typeof import('@shikijs/twoslash').transformerTwoslash;
  getTwoslashOptions: typeof import('./twoslash/config.js').getTwoslashOptions;
  parseLineComment: typeof import('./twoslash/config.js').parseLineComment;
};

let twoslashModulePromise: Promise<TwoslashModule> | null = null;

// twoslash pulls in typescript and the rich renderer; only blocks flagged with the
// twoslash meta need them, so keep them off the cold-start path
function getTwoslashModule(): Promise<TwoslashModule> {
  if (!twoslashModulePromise) {
    twoslashModulePromise = Promise.all([
      import('@shikijs/twoslash'),
      import('./twoslash/config.js'),
    ]).then(([twoslash, config]) => ({
      transformerTwoslash: twoslash.transformerTwoslash,
      getTwoslashOptions: config.getTwoslashOptions,
      parseLineComment: config.parseLineComment,
    }));
  }
  return twoslashModulePromise;
}

// highlighted output is a pure function of (code, lang, themes) for bundled
// grammars; localized docs and shared snippets repeat the same blocks across
// pages, so keep recent results in-process. entries are cloned on the way out
// because downstream plugins mutate the tree
const HIGHLIGHT_CACHE_LIMIT = 4000;
const HIGHLIGHT_CACHE_MAX_CODE_LENGTH = 50_000;
const highlightCache = new Map<string, Element>();

function getCachedHighlight(key: string): Element | undefined {
  const hit = highlightCache.get(key);
  if (!hit) return undefined;
  highlightCache.delete(key);
  highlightCache.set(key, hit);
  return cloneElement(hit);
}

function setCachedHighlight(key: string, element: Element): void {
  if (highlightCache.size >= HIGHLIGHT_CACHE_LIMIT) {
    const oldest = highlightCache.keys().next().value;
    if (oldest !== undefined) highlightCache.delete(oldest);
  }
  highlightCache.set(key, cloneElement(element));
}

function cloneElement(element: Element): Element {
  return {
    type: 'element',
    tagName: element.tagName,
    properties: { ...element.properties },
    children: element.children.map(cloneContent),
  };
}

function cloneContent(content: ElementContent): ElementContent {
  if (content.type === 'element') return cloneElement(content);
  return { ...content };
}

function hasTwoslashFlag(node: Element): boolean {
  const meta = node.data?.meta;
  return (
    typeof meta === 'string' && meta.split(' ').some((str) => str.toLowerCase() === 'twoslash')
  );
}

export const rehypeSyntaxHighlighting: Plugin<[RehypeSyntaxHighlightingOptions?], Root, Root> = (
  options = {}
) => {
  return async (tree) => {
    const nodesToProcess: Promise<void>[] = [];
    const customLanguageNames: string[] = [];

    const themesToLoad: ShikiTheme[] = [];
    if (options.themes) {
      themesToLoad.push(options.themes.dark);
      themesToLoad.push(options.themes.light);
    } else if (options.theme) {
      themesToLoad.push(options.theme);
    }

    const highlighter = await getHighlighter();

    await Promise.all([
      ...themesToLoad
        .filter(
          (theme): theme is Exclude<ShikiTheme, 'css-variables'> =>
            !DEFAULT_THEMES.includes(theme) && theme !== 'css-variables'
        )
        .map((theme) => highlighter.loadTheme(theme)),
      ...(options.customLanguages?.map(async (unparsedLang) => {
        const parsedLang = JSON.parse(unparsedLang);
        const lang = TextMateGrammar(parsedLang);
        if (lang instanceof type.errors) {
          console.error(lang.summary);
          return;
        }
        await highlighter.loadLanguage(lang);
        const possibleNames = [lang.name, lang.displayName, ...(lang.aliases ?? [])];
        customLanguageNames.push(...possibleNames.filter((l) => l != undefined));
      }) ?? []),
    ]);

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

      if (!UNIQUE_LANGS.includes(lang) && !customLanguageNames.includes(lang)) {
        lang = DEFAULT_LANG;
      }

      const twoslash = hasTwoslashFlag(node) ? getTwoslashModule() : undefined;
      const grammar = customLanguageNames.includes(lang)
        ? undefined
        : loadLanguage(highlighter, lang);

      const cacheable = !twoslash && !customLanguageNames.includes(lang);

      nodesToProcess.push(
        Promise.all([grammar, twoslash]).then(([, twoslashModule]) => {
          traverseNode({
            node,
            index,
            parent,
            highlighter,
            lang,
            options,
            twoslashModule,
            cacheable,
          });
        })
      );
    });
    await Promise.all(nodesToProcess);
  };
};

function traverseNode({
  node,
  index,
  parent,
  highlighter,
  lang,
  options,
  twoslashModule,
  cacheable,
}: {
  node: Element;
  index: number;
  parent: Element | Root | MdxJsxTextElementHast | MdxJsxFlowElementHast;
  highlighter: Highlighter;
  lang: ShikiLang;
  options: RehypeSyntaxHighlightingOptions;
  twoslashModule: TwoslashModule | undefined;
  cacheable: boolean;
}) {
  try {
    let code = toString(node);

    const meta = node.data?.meta?.split(' ') ?? [];
    const twoslashIndex = meta.findIndex((str) => str.toLowerCase() === 'twoslash');
    const shouldUseTwoslash = twoslashIndex > -1 && twoslashModule !== undefined;

    if (node.data && node.data.meta && shouldUseTwoslash) {
      meta.splice(twoslashIndex, 1);
      node.data.meta = meta.join(' ').trim() || undefined;
    }

    const linkMap = options.linkMap ?? new Map();
    if (shouldUseTwoslash) {
      const splitCode = code.split('\n');

      for (const [i, line] of splitCode.entries()) {
        const parsedLineComment = twoslashModule.parseLineComment(line);
        if (!parsedLineComment) continue;
        const { word, href } = parsedLineComment;
        linkMap.set(word, href);
        splitCode.splice(i, 1);
      }

      code = splitCode.join('\n');
    }

    // transformerTwoslash builds a typescript virtual fs on construction, and with
    // explicitTrigger it is a no-op for blocks without the twoslash meta flag
    const transformers = shouldUseTwoslash
      ? [
          ...SHIKI_TRANSFORMERS,
          twoslashModule.transformerTwoslash(twoslashModule.getTwoslashOptions({ linkMap })),
        ]
      : SHIKI_TRANSFORMERS;

    const themes = {
      light:
        options.themes?.light ??
        options.theme ??
        (options.codeStyling === 'dark' ? DEFAULT_DARK_THEME : DEFAULT_LIGHT_THEME),
      dark: options.themes?.dark ?? options.theme ?? DEFAULT_DARK_THEME,
    };

    const cacheKey =
      cacheable && !shouldUseTwoslash && code.length <= HIGHLIGHT_CACHE_MAX_CODE_LENGTH
        ? `${lang}\0${themes.light}\0${themes.dark}\0${code}`
        : undefined;

    let codeElement = cacheKey ? getCachedHighlight(cacheKey) : undefined;

    if (!codeElement) {
      const hast = highlighter.codeToHast(code, {
        lang: lang ?? DEFAULT_LANG,
        meta: shouldUseTwoslash ? { __raw: 'twoslash' } : undefined,
        themes,
        colorReplacements: shikiColorReplacements,
        tabindex: false,
        tokenizeMaxLineLength: 1000,
        transformers,
      });

      const highlighted = hast.children[0];
      if (!highlighted || highlighted.type !== 'element') return;
      if (cacheKey) setCachedHighlight(cacheKey, highlighted);
      codeElement = highlighted;
    }

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
}

export { TextMateGrammar, type TextMateGrammarType };
