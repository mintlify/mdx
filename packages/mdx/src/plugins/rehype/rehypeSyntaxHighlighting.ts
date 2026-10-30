import { createSyntaxHighlighting, type TwoslashSupport } from './rehypeSyntaxHighlightingCore.js';

export type { RehypeSyntaxHighlightingOptions } from './rehypeSyntaxHighlightingCore.js';
export { TextMateGrammar, type TextMateGrammarType } from './shiki/custom-language.js';

let twoslashPromise: Promise<TwoslashSupport> | null = null;

function loadTwoslash(): Promise<TwoslashSupport> {
  if (!twoslashPromise) {
    twoslashPromise = import('./twoslash/config.js').then(
      (loaded): TwoslashSupport => ({
        parseLineComment: loaded.parseLineComment,
        createTransformer: (linkMap) =>
          loaded.transformerTwoslash(loaded.getTwoslashOptions({ linkMap })),
      })
    );
  }
  return twoslashPromise;
}

export const rehypeSyntaxHighlighting = createSyntaxHighlighting(loadTwoslash);
