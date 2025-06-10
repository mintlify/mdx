import { evaluate } from 'next-mdx-remote-client/rsc';
import { serialize as baseSerialize } from 'next-mdx-remote-client/serialize';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkSmartypants from 'remark-smartypants';

import { rehypeSyntaxHighlighting, RehypeSyntaxHighlightingOptions } from '../plugins/index.js';
import type { SerializeOptions } from '../types/index.js';

export const serialize = async ({
  source,
  mdxOptions,
  scope,
  parseFrontmatter = true,
  syntaxHighlightingOptions,
}: {
  source: string;
  mdxOptions?: SerializeOptions['mdxOptions'];
  scope?: SerializeOptions['scope'];
  parseFrontmatter?: SerializeOptions['parseFrontmatter'];
  syntaxHighlightingOptions?: RehypeSyntaxHighlightingOptions;
}) => {
  try {
    return await baseSerialize({
      source,
      options: {
        mdxOptions: {
          ...mdxOptions,
          remarkPlugins: [
            remarkGfm,
            remarkSmartypants,
            remarkMath,
            ...(mdxOptions?.remarkPlugins || []),
          ],
          rehypePlugins: [
            rehypeKatex,
            [rehypeSyntaxHighlighting, syntaxHighlightingOptions],
            ...(mdxOptions?.rehypePlugins || []),
          ],
          format: mdxOptions?.format || 'mdx',
        },
        scope,
        parseFrontmatter,
      },
    });
  } catch (error) {
    console.error(`Error occurred while serializing MDX: ${error}`);

    throw error;
  }
};

export const rscSerialize = async ({
  source,
  mdxOptions,
  scope,
  parseFrontmatter = true,
  syntaxHighlightingOptions,
}: {
  source: string;
  mdxOptions?: SerializeOptions['mdxOptions'];
  scope?: SerializeOptions['scope'];
  parseFrontmatter?: SerializeOptions['parseFrontmatter'];
  syntaxHighlightingOptions?: RehypeSyntaxHighlightingOptions;
}) => {
  try {
    return await evaluate({
      source,
      options: {
        mdxOptions: {
          ...mdxOptions,
          remarkPlugins: [
            remarkGfm,
            remarkSmartypants,
            remarkMath,
            ...(mdxOptions?.remarkPlugins || []),
          ],
          rehypePlugins: [
            rehypeKatex,
            [rehypeSyntaxHighlighting, syntaxHighlightingOptions],
            ...(mdxOptions?.rehypePlugins || []),
          ],
          format: mdxOptions?.format || 'mdx',
        },
        scope,
        parseFrontmatter,
      },
    });
  } catch (error) {
    console.error(`Error occurred while serializing MDX: ${error}`);

    throw error;
  }
};
