import { MDXRemote as BaseMDXRemote, MDXComponents } from 'next-mdx-remote-client/rsc';
import { SerializeOptions } from 'next-mdx-remote-client/serialize';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkSmartypants from 'remark-smartypants';

import { rehypeSyntaxHighlighting } from '../plugins';

export async function MDXRemote({
  source,
  mdxOptions,
  scope,
  components,
  parseFrontmatter,
}: {
  source: string;
  mdxOptions?: SerializeOptions['mdxOptions'];
  scope?: SerializeOptions['scope'];
  components?: MDXComponents;
  parseFrontmatter?: SerializeOptions['parseFrontmatter'];
}) {
  return (
    // @ts-expect-error Server Component
    <BaseMDXRemote
      source={source}
      components={components}
      options={{
        scope,
        mdxOptions: {
          remarkPlugins: [
            remarkGfm,
            remarkSmartypants,
            remarkMath,
            ...(mdxOptions?.remarkPlugins || []),
          ],
          rehypePlugins: [
            rehypeKatex,
            [rehypeSyntaxHighlighting, { ignoreMissing: true }],
            ...(mdxOptions?.rehypePlugins || []),
          ],
          format: mdxOptions?.format || 'mdx',
        },
        parseFrontmatter,
      }}
    />
  );
}
