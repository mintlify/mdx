import { serialize as baseSerialize } from 'next-mdx-remote-client/serialize';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkSmartypants from 'remark-smartypants';
import { VFile } from 'vfile';

import {
  rehypeKatexWithLocation,
  rehypeSyntaxHighlighting,
  RehypeSyntaxHighlightingOptions,
} from '../plugins/index.js';
import type { SerializeOptions } from '../types/index.js';

export const serialize = async ({
  source,
  mdxOptions,
  scope,
  parseFrontmatter = true,
  syntaxHighlightingOptions,
  path,
}: {
  source: string;
  mdxOptions?: SerializeOptions['mdxOptions'];
  scope?: SerializeOptions['scope'];
  parseFrontmatter?: SerializeOptions['parseFrontmatter'];
  syntaxHighlightingOptions?: RehypeSyntaxHighlightingOptions;
  path?: string;
}) => {
  try {
    return await baseSerialize({
      source: path ? new VFile({ value: source, path }) : source,
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
            rehypeKatexWithLocation,
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
