import type { Root } from 'hast';
import { getSingletonHighlighter } from 'shiki';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';

import { DEFAULT_THEMES, DEFAULT_LANGS } from './constants.js';
import { handlePreCode } from './handlers.js';
import type { RehypeSyntaxHighlightingOptions } from './types.js';
import { getLanguagesToLoad, getThemesToLoad } from './utils.js';

const highlighterPromise = getSingletonHighlighter({
  themes: DEFAULT_THEMES,
  langs: DEFAULT_LANGS,
});

/** Rehype plugin with syntax highlighting, twoslash and etc. */
const rehypeSyntaxHighlighting: Plugin<[RehypeSyntaxHighlightingOptions?], Root, Root> = (
  options = {}
) => {
  return async (tree) => {
    // Declare highlighter
    const highlighter = await highlighterPromise;

    // Parse options
    const themesToLoad = getThemesToLoad(options);
    const languagesToLoad = getLanguagesToLoad(options);

    // Load themes and languages passed in options
    await Promise.all([
      ...themesToLoad.map((theme) => highlighter.loadTheme(theme)),
      ...languagesToLoad.map((lang) => highlighter.loadLanguage(lang)),
    ]);

    const queue: Promise<void>[] = [];

    // Visit HAST and apply highlight & twoslash
    visit(tree, 'element', (node, index, parent) => {
      const child = node.children[0];

      // required for HAST node replacement
      if (!parent || index === undefined) return;

      // handle `<pre><code>...</code></pre>`
      if (node.tagName === 'pre' && child?.type === 'element' && child.tagName === 'code') {
        handlePreCode({ node, child, index, parent, highlighter, options, queue });
      }
    });

    await Promise.all(queue);
  };
};

export { rehypeSyntaxHighlighting };
