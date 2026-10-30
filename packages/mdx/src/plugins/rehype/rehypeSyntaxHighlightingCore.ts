import { type } from 'arktype';
import type { Element, Root } from 'hast';
import { toString } from 'hast-util-to-string';
import type { MdxJsxFlowElementHast, MdxJsxTextElementHast } from 'mdast-util-mdx-jsx';
import {
  createHighlighter,
  type CodeToHastOptions,
  type Highlighter,
  type ShikiInternal,
  type ShikiTransformer,
} from 'shiki';
import { codeToHast } from 'shiki/core';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';

import { shellPlaceholderTransformer } from './shell-placeholder-transformer.js';
import {
  type ShikiLang,
  type ShikiTheme,
  shikiColorReplacements,
  DEFAULT_LANG_ALIASES,
  DEFAULT_LANG,
  DEFAULT_DARK_THEME,
  DEFAULT_LIGHT_THEME,
  DEFAULT_THEMES,
  DEFAULT_LANGS,
  SHIKI_TRANSFORMERS,
  UNIQUE_LANGS,
} from './shiki-constants.js';
import { TextMateGrammar } from './shiki/custom-language.js';
import { singlePassInternal, tooDeep } from './shiki/single-pass.js';
import { getLanguage } from './utils.js';

export type TwoslashSupport = {
  parseLineComment: (line: string) => { word: string; href: string } | undefined;
  createTransformer: (linkMap: Map<string, string>) => ShikiTransformer;
};

function wantsTwoslash(node: Element): boolean {
  return (node.data?.meta?.split(' ') ?? []).some((str) => str.toLowerCase() === 'twoslash');
}

export type RehypeSyntaxHighlightingOptions = {
  theme?: ShikiTheme;
  themes?: Record<'light' | 'dark', ShikiTheme>;
  codeStyling?: 'dark' | 'system' | 'light' | Record<string, unknown> | null;
  linkMap?: Map<string, string>;
  customLanguages?: string[];
};

let highlighterPromise: Promise<Highlighter> | null = null;
let singlePass: ShikiInternal | null = null;

async function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: DEFAULT_THEMES,
      langs: DEFAULT_LANGS,
    });
  }
  return highlighterPromise;
}

type LoadableLanguage = Parameters<Highlighter['loadLanguage']>[0];

function getLoadedGrammars(highlighter: Highlighter): Set<ReturnType<Highlighter['getLanguage']>> {
  const grammars = new Set<ReturnType<Highlighter['getLanguage']>>();
  for (const name of highlighter.getLoadedLanguages()) {
    try {
      grammars.add(highlighter.getLanguage(name));
    } catch {}
  }
  return grammars;
}

// loading a language that a loaded grammar embeds lazily makes shiki rebuild that grammar
// without disposing the old one, leaking its oniguruma scanners in wasm memory
async function loadLanguage(highlighter: Highlighter, lang: LoadableLanguage): Promise<void> {
  const before = getLoadedGrammars(highlighter);
  await highlighter.loadLanguage(lang);
  const after = getLoadedGrammars(highlighter);
  for (const grammar of before) {
    if (!after.has(grammar)) (grammar as { dispose?: () => void }).dispose?.();
  }
}

export const createSyntaxHighlighting =
  (
    loadTwoslash: () => Promise<TwoslashSupport>
  ): Plugin<[RehypeSyntaxHighlightingOptions?], Root, Root> =>
  (options = {}) => {
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
      const fast = (singlePass ??= singlePassInternal(highlighter));
      const loadedThemes = highlighter.getLoadedThemes();

      await Promise.all([
        ...themesToLoad
          .filter(
            (theme): theme is Exclude<ShikiTheme, 'css-variables'> =>
              !DEFAULT_THEMES.includes(theme) &&
              theme !== 'css-variables' &&
              !loadedThemes.includes(theme)
          )
          .map((theme) => highlighter.loadTheme(theme)),
        ...(options.customLanguages?.map(async (unparsedLang) => {
          const parsedLang = JSON.parse(unparsedLang);
          const lang = TextMateGrammar(parsedLang);
          if (lang instanceof type.errors) {
            console.error(lang.summary);
            return;
          }
          await loadLanguage(highlighter, lang);
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

        const needsLanguage =
          !DEFAULT_LANGS.includes(lang) &&
          !customLanguageNames.includes(lang) &&
          UNIQUE_LANGS.includes(lang);
        if (!needsLanguage && !UNIQUE_LANGS.includes(lang) && !customLanguageNames.includes(lang)) {
          lang = DEFAULT_LANG;
        }

        const twoslash = wantsTwoslash(node) ? loadTwoslash() : undefined;
        const internal =
          twoslash || customLanguageNames.includes(lang) ? highlighter.getInternalContext() : fast;
        if (!needsLanguage && !twoslash) {
          traverseNode({ node, index, parent, highlighter, internal, lang, options });
          return;
        }

        nodesToProcess.push(
          Promise.all([needsLanguage ? loadLanguage(highlighter, lang) : undefined, twoslash]).then(
            ([, loaded]) => {
              traverseNode({
                node,
                index,
                parent,
                highlighter,
                internal,
                lang,
                options,
                twoslash: loaded,
              });
            }
          )
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
  internal,
  lang,
  options,
  twoslash,
}: {
  node: Element;
  index: number;
  parent: Element | Root | MdxJsxTextElementHast | MdxJsxFlowElementHast;
  highlighter: Highlighter;
  internal: ShikiInternal;
  lang: ShikiLang;
  options: RehypeSyntaxHighlightingOptions;
  twoslash?: TwoslashSupport;
}) {
  try {
    let code = toString(node);

    const transformers = [...SHIKI_TRANSFORMERS];
    if (twoslash) {
      const meta = node.data?.meta?.split(' ') ?? [];
      const twoslashIndex = meta.findIndex((str) => str.toLowerCase() === 'twoslash');
      if (node.data && node.data.meta && twoslashIndex > -1) {
        meta.splice(twoslashIndex, 1);
        node.data.meta = meta.join(' ').trim() || undefined;
      }

      const linkMap = options.linkMap ?? new Map();
      const splitCode = code.split('\n');

      for (const [i, line] of splitCode.entries()) {
        const parsedLineComment = twoslash.parseLineComment(line);
        if (!parsedLineComment) continue;
        const { word, href } = parsedLineComment;
        linkMap.set(word, href);
        splitCode.splice(i, 1);
      }

      code = splitCode.join('\n');
      transformers.push(twoslash.createTransformer(linkMap));
    }

    if (lang === 'shellscript') transformers.push(shellPlaceholderTransformer);

    const hastOptions: CodeToHastOptions = {
      lang: lang ?? DEFAULT_LANG,
      meta: twoslash ? { __raw: 'twoslash' } : undefined,
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
      // the default 500ms wall-clock limit makes output depend on gc pauses
      tokenizeTimeLimit: 0,
      transformers,
    };

    let hast;
    try {
      hast = codeToHast(internal, code, hastOptions);
    } catch (err) {
      if (err !== tooDeep) throw err;
      hast = highlighter.codeToHast(code, hastOptions);
    }

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
}
