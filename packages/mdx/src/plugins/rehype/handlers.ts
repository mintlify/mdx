import { transformerTwoslash } from '@shikijs/twoslash';
import type { Root, Element } from 'hast';
import { toString } from 'hast-util-to-string';
import { MdxJsxFlowElementHast, MdxJsxTextElementHast } from 'mdast-util-mdx-jsx';
import { Highlighter } from 'shiki';

import {
  DEFAULT_DARK_THEME,
  DEFAULT_LANG,
  DEFAULT_LANG_ALIASES,
  DEFAULT_LANGS,
  DEFAULT_LIGHT_THEME,
  SHIKI_TRANSFORMERS,
  SHIKI_COLOR_REPLACEMENTS,
  UNIQUE_LANGS,
} from './constants.js';
import { getTwoslashOptions, parseLineComment } from './twoslash/config.js';
import { RehypeSyntaxHighlightingOptions, ShikiLang } from './types.js';
import { getCustomLanguagesNames, getLanguage } from './utils.js';

/** Handles `<pre><code>...</code></pre>` nodes */
function handlePreCode({
  node,
  child,
  index,
  parent,
  highlighter,
  options,
  queue,
}: {
  node: Element;
  child: Element;
  index: number;
  parent: Element | Root | MdxJsxTextElementHast | MdxJsxFlowElementHast;
  highlighter: Highlighter;
  options: RehypeSyntaxHighlightingOptions;
  queue: Promise<void>[];
}) {
  // Determine language
  const preNodeLang = getLanguage(node, DEFAULT_LANG_ALIASES);
  const codeNodeLang = getLanguage(child, DEFAULT_LANG_ALIASES);
  const lang = preNodeLang ?? codeNodeLang ?? DEFAULT_LANG;

  // Set metadata on code node copied from pre node
  if (!Object.keys(node.properties).length) {
    node.properties = child.properties;
  }

  if (!node.data) {
    node.data = child.data;
  }

  // Traverse node
  const customLanguageNames = getCustomLanguagesNames(options);
  const isLanguageLoaded = DEFAULT_LANGS.includes(lang) || customLanguageNames.includes(lang);

  if (isLanguageLoaded) {
    traverseNode({ node, index, parent, highlighter, lang, options });
  } else if (UNIQUE_LANGS.includes(lang)) {
    queue.push(
      highlighter.loadLanguage(lang).then(() => {
        traverseNode({ node, index, parent, highlighter, lang, options });
      })
    );
  } else {
    traverseNode({ node, index, parent, highlighter, lang: DEFAULT_LANG, options });
  }
}

/** Traverse node and apply highlighting and twoslash */
function traverseNode({
  node,
  index,
  parent,
  highlighter,
  lang,
  options,
}: {
  node: Element;
  index: number;
  parent: Element | Root | MdxJsxTextElementHast | MdxJsxFlowElementHast;
  highlighter: Highlighter;
  lang: ShikiLang;
  options: RehypeSyntaxHighlightingOptions;
}) {
  try {
    let code = toString(node);

    const meta = node.data?.meta?.split(' ') ?? [];
    const twoslashIndex = meta.findIndex((str) => str.toLowerCase() === 'twoslash');
    const shouldUseTwoslash = twoslashIndex > -1;

    // Remove twoslash from meta list
    if (node.data && node.data.meta && shouldUseTwoslash) {
      meta.splice(twoslashIndex, 1);
      node.data.meta = meta.join(' ').trim() || undefined;
    }

    // Set Link Map
    const linkMap = options.linkMap ?? new Map();

    if (shouldUseTwoslash) {
      const codeLines = code.split('\n');

      for (const [i, line] of codeLines.entries()) {
        const parsedLineComment = parseLineComment(line);

        if (!parsedLineComment) continue;

        const { word, href } = parsedLineComment;

        linkMap.set(word, href);

        // Remove twoslash line from code lines
        codeLines.splice(i, 1);
      }

      code = codeLines.join('\n');
    }

    // Convert code to HAST and apply transformers
    const twoslashOptions = getTwoslashOptions({ linkMap });

    const hast = highlighter.codeToHast(code, {
      lang: lang ?? DEFAULT_LANG,
      meta: shouldUseTwoslash ? { __raw: 'twoslash' } : undefined,
      themes: {
        light:
          options.themes?.light ??
          options.theme ??
          (options.codeStyling === 'dark' ? DEFAULT_DARK_THEME : DEFAULT_LIGHT_THEME),
        dark: options.themes?.dark ?? options.theme ?? DEFAULT_DARK_THEME,
      },
      colorReplacements: SHIKI_COLOR_REPLACEMENTS,
      tabindex: false,
      tokenizeMaxLineLength: 1000,
      transformers: [...SHIKI_TRANSFORMERS, transformerTwoslash(twoslashOptions)],
    });

    // Set code node metadata
    const preCodeNode = hast.children[0] as Element;

    if (!preCodeNode) return;

    node.data = node.data ?? {};

    preCodeNode.data = node.data;
    preCodeNode.properties.language = lang;

    // Set pre node metadata
    const codeNode = preCodeNode.children[0] as Element;

    if (codeNode) {
      codeNode.data = node.data;
      codeNode.properties.language = lang;
    }

    // Replace previous precode node with new precode node
    parent.children.splice(index, 1, preCodeNode);
  } catch (err) {
    if (err instanceof Error && /Unknown language/.test(err.message)) {
      return;
    }

    throw err;
  }
}

export { handlePreCode };
