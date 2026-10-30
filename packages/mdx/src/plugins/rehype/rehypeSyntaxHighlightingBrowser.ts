import { createSyntaxHighlighting } from './rehypeSyntaxHighlightingCore.js';

export type { RehypeSyntaxHighlightingOptions } from './rehypeSyntaxHighlightingCore.js';

/** Published highlighting without Node-only Twoslash support. */
export const rehypeSyntaxHighlighting = createSyntaxHighlighting(() => {
  throw new Error('Twoslash is not supported by @mintlify/mdx/plugins/syntax-highlighting');
});
