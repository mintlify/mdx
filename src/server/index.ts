import type { SerializeOptions } from "next-mdx-remote/dist/types";
import { serialize } from "next-mdx-remote/serialize";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkSmartypants from "remark-smartypants";
import { MDXRemoteProps, compileMDX } from "next-mdx-remote/rsc";

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

export const getCompiledServerMDX = ({
  source,
  options,
  components,
}: MDXRemoteProps) =>
  compileMDX({
    source,
    options,
    components,
  });
