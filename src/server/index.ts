import type { SerializeOptions } from "next-mdx-remote/dist/types";
import { compileMDX } from "next-mdx-remote/rsc";
import type { MDXRemoteProps } from "next-mdx-remote/rsc";
import { serialize } from "next-mdx-remote/serialize";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkSmartypants from "remark-smartypants";

import { rehypeSyntaxHighlighting } from "../plugins/index.js";

export const getCompiledMdx = async ({
  source,
  mdxOptions,
  scope,
  parseFrontmatter = true,
}: {
  source: string;
  mdxOptions?: SerializeOptions["mdxOptions"];
  scope?: SerializeOptions["scope"];
  parseFrontmatter?: SerializeOptions["parseFrontmatter"];
}) => {
  try {
    const serializedResponse = await serialize(source, {
      mdxOptions: {
        remarkPlugins: [
          remarkGfm,
          remarkSmartypants,
          remarkMath,
          ...(mdxOptions?.remarkPlugins || []),
        ],
        rehypePlugins: [
          rehypeKatex,
          [
            rehypeSyntaxHighlighting,
            {
              ignoreMissing: true,
            },
          ],
          ...(mdxOptions?.rehypePlugins || []),
        ],
        format: "mdx",
        useDynamicImport: true,
      },
      scope,
      parseFrontmatter,
    });

    return serializedResponse;
  } catch (error) {
    console.error(`Error occurred while serializing MDX: ${error}`);

    throw error;
  }
};

export const getCompiledServerMdx = async ({
  source,
  mdxOptions,
  components,
  parseFrontmatter = true,
}: {
  source: MDXRemoteProps["source"];
  mdxOptions?: SerializeOptions["mdxOptions"];
  components?: MDXRemoteProps["components"];
  parseFrontmatter?: SerializeOptions["parseFrontmatter"];
}) => {
  return await compileMDX({
    source,
    options: {
      mdxOptions: {
        remarkPlugins: [
          remarkGfm,
          remarkSmartypants,
          remarkMath,
          ...(mdxOptions?.remarkPlugins || []),
        ],
        rehypePlugins: [
          rehypeKatex,
          [
            rehypeSyntaxHighlighting,
            {
              ignoreMissing: true,
            },
          ],
          ...(mdxOptions?.rehypePlugins || []),
        ],
        format: "mdx",
        useDynamicImport: true,
      },
      parseFrontmatter,
    },
    components,
  });
};
